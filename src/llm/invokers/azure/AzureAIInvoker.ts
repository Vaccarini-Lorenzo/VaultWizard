import { AIInvoker, AIInvokerInput } from "../AIInvoker";
import { AzureResponsesInputBuilder } from "./helpers/AzureResponsesInputBuilder";
import { AzureResponsesSseReader } from "./helpers/AzureResponsesSseReader";
import { AzureResponsesTextExtractor } from "./helpers/AzureResponsesTextExtractor";

export class AzureAIInvoker implements AIInvoker {
    private readonly inputBuilder = new AzureResponsesInputBuilder();
    private readonly textExtractor = new AzureResponsesTextExtractor();
    private readonly sseReader = new AzureResponsesSseReader(this.textExtractor);

    async streamResponse(
        aiInvokerInput: AIInvokerInput,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        const endpointBase = this.tryGetSetting(aiInvokerInput, "endpoint");
        const apiKey = this.tryGetSetting(aiInvokerInput, "apiKey");
        const deploymentName = this.tryGetSetting(aiInvokerInput, "deploymentName");
        const apiVersion = this.tryGetSetting(aiInvokerInput, "apiVersion");
        const endpointUrl = this.buildResponsesUrl(endpointBase, apiVersion);

        const requestBody: Record<string, unknown> = {
            model: deploymentName,
            input: this.inputBuilder.build(aiInvokerInput),
            max_output_tokens: 2048,
            stream: true
        };

        const response = await fetch(endpointUrl, {
            method: "POST",
            headers: this.buildHeaders(apiKey),
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Azure REST error ${response.status}: ${errorText}`);
        }

        if (!response.body) {
            const json = await response.json();
            const completeText = this.textExtractor.extractText(json);
            if (completeText) {
                onChunk(completeText);
            }
            return;
        }

        await this.sseReader.consume(response, onChunk);
    }

    private buildHeaders(apiKey: string): HeadersInit {
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
        };
    }

    private tryGetSetting(aiInvokerInput: AIInvokerInput, settingName: string): string {
        const settingValue = aiInvokerInput.configuredModel.settings[settingName];
        if (!settingValue) {
            throw new Error(`Missing required setting: ${settingName}`);
        }
        return settingValue;
    }

    private buildResponsesUrl(endpointBase: string, apiVersion: string): string {
        const normalizedEndpointBase = endpointBase.replace(/\/+$/, "");
        return `${normalizedEndpointBase}/openai/responses?api-version=${encodeURIComponent(apiVersion)}`;
    }
}