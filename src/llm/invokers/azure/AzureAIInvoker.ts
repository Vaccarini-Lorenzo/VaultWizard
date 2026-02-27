import { AIInvoker, AIInvokerInput, AIInvokerResult } from "../AIInvoker";
import { TokenUsage } from "../../../models/llm/TokenUsage";
import { AzureResponsesSseReader } from "./helpers/AzureResponsesSseReader";
import { AzureResponsesTextExtractor } from "./helpers/AzureResponsesTextExtractor";
import { AzureResponsesUsageExtractor } from "./helpers/AzureResponsesUsageExtractor";
import { currentChatStorage } from "services/chat/CurrentChatStorage";

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

        const additionalJsonBody = this.tryParseAdditionalJsonBody(aiInvokerInput);
        const requestBody = this.buildRequestBody(deploymentName, additionalJsonBody);

        const response = await fetch(endpointUrl, {
            method: "POST",
            headers: this.buildHeaders(apiKey),
            body: JSON.stringify(requestBody)
        });

        console.log("body:", requestBody);

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
        return `${normalizedEndpointBase}?api-version=${encodeURIComponent(apiVersion)}`;
    }

    private buildInputMessages(): Array<{ role: string; content: string }> {
        const messages = currentChatStorage.getMessages().map(msg => {
            let role = msg.role;
            let content = msg.content;
            if (role == "developer"){
                role = "developer"
                content = content
            }
            return { role, content };
        });
        return messages;
    }

    private buildRequestBody(
        deploymentName: string,
        additionalJsonBody?: Record<string, unknown>
    ): Record<string, unknown> {
        const baseRequestBody: Record<string, unknown> = {
            model: deploymentName,
            input: this.buildInputMessages(),
            max_output_tokens: 50000,
            stream: true,
            reasoning: {
                effort: "xhigh"
            }
        };

        return additionalJsonBody
            ? { ...baseRequestBody, ...additionalJsonBody }
            : baseRequestBody;
    }

    private tryParseAdditionalJsonBody(aiInvokerInput: AIInvokerInput): Record<string, unknown> | undefined {
        const additionalJsonBodyRawValue = aiInvokerInput.configuredModel.settings["additional_json_body"];
        if (!additionalJsonBodyRawValue?.trim()) {
            return undefined;
        }

        let parsedAdditionalJsonBody: unknown;
        try {
            parsedAdditionalJsonBody = JSON.parse(additionalJsonBodyRawValue);
        } catch {
            throw new Error(`Invalid JSON in "additional_json_body". Expected a valid JSON object.`);
        }

        const isValidJsonObject =
            typeof parsedAdditionalJsonBody === "object" &&
            parsedAdditionalJsonBody !== null &&
            !Array.isArray(parsedAdditionalJsonBody);

        if (!isValidJsonObject) {
            throw new Error(`Invalid "additional_json_body". Expected a JSON object.`);
        }

        return parsedAdditionalJsonBody as Record<string, unknown>;
    }
}