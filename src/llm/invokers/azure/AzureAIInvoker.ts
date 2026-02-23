import { AIInvoker, AIInvokerInput, AIInvokerResult } from "../AIInvoker";
import { TokenUsage } from "../../../models/TokenUsage";
import { AzureResponsesSseReader } from "./helpers/AzureResponsesSseReader";
import { AzureResponsesTextExtractor } from "./helpers/AzureResponsesTextExtractor";
import { AzureResponsesUsageExtractor } from "./helpers/AzureResponsesUsageExtractor";
import { currentChatStorage } from "services/CurrentChatStorage";

export class AzureAIInvoker implements AIInvoker {
    private readonly textExtractor = new AzureResponsesTextExtractor();
    private readonly usageExtractor = new AzureResponsesUsageExtractor();
    private readonly sseReader = new AzureResponsesSseReader(this.textExtractor);

    async streamResponse(
        aiInvokerInput: AIInvokerInput,
        onChunk: (chunk: string) => void
    ): Promise<AIInvokerResult> {
        const endpointBase = this.tryGetSetting(aiInvokerInput, "endpoint");
        const apiKey = this.tryGetSetting(aiInvokerInput, "apiKey");
        const deploymentName = this.tryGetSetting(aiInvokerInput, "deploymentName");
        const apiVersion = this.tryGetSetting(aiInvokerInput, "apiVersion");
        const endpointUrl = this.buildResponsesUrl(endpointBase, apiVersion);

        console.log(aiInvokerInput)

        const requestBody: Record<string, unknown> = {
            model: deploymentName,
            input: this.buildInputMessages(),
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

        let finalTokenUsage: TokenUsage | undefined;

        if (!response.body) {
            const json = await response.json();
            const completeText = this.textExtractor.extractText(json);
            if (completeText) {
                onChunk(completeText);
            }

            const extractedUsage = this.usageExtractor.extract(json);
            if (extractedUsage) {
                finalTokenUsage = extractedUsage;
            }

            return { tokenUsage: finalTokenUsage };
        }

        await this.sseReader.consume(response, onChunk, (eventPayload) => {
            const extractedUsage = this.usageExtractor.extract(eventPayload);
            if (extractedUsage) {
                finalTokenUsage = extractedUsage;
            }
        });

        return { tokenUsage: finalTokenUsage };
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

    private buildInputMessages(): Array<{ role: string; content: string }> {
        const messages = currentChatStorage.getMessages().map(msg => {
            let role = msg.role;
            let content = msg.content;
            if (role == "tool"){
                role = "user"
                content = `<CONTEXT>\n${content}\n</CONTEXT>`
            }
            return { role, content };
        });
        return messages;
    }
}