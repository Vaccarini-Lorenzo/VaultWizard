import { TokenUsage } from "../../../models/llm/TokenUsage";
import { AzureResponsesSseReader } from "./helpers/AzureResponsesSseReader";
import { AzureResponsesTextExtractor } from "./helpers/AzureResponsesTextExtractor";
import { AzureResponsesUsageExtractor } from "./helpers/AzureResponsesUsageExtractor";
import { currentChatStorage } from "services/chat/CurrentChatStorage";
import { AzureClientCredentialsTokenProvider } from "./helpers/AzureClientCredentialsTokenProvider";
import { AIInvoker, AIInvokerInput, AIInvokerResult } from "../AIInvoker";

export class AzureAIInvoker implements AIInvoker {
    private readonly textExtractor = new AzureResponsesTextExtractor();
    private readonly usageExtractor = new AzureResponsesUsageExtractor();
    private readonly sseReader = new AzureResponsesSseReader(this.textExtractor);
    private readonly azureClientCredentialsTokenProvider = new AzureClientCredentialsTokenProvider();

    async streamResponse(
        aiInvokerInput: AIInvokerInput,
        onChunk: (chunk: string) => void
    ): Promise<AIInvokerResult> {
        const endpointBase = this.tryGetRequiredSetting(aiInvokerInput, "endpoint");
        const deploymentName = this.tryGetRequiredSetting(aiInvokerInput, "deploymentName");
        const apiVersion = this.tryGetRequiredSetting(aiInvokerInput, "apiVersion");
        const endpointUrl = this.buildResponsesUrl(endpointBase, apiVersion);

        const additionalJsonBody = this.tryParseAdditionalJsonBody(aiInvokerInput);
        const requestBody = this.buildRequestBody(deploymentName, additionalJsonBody);
        const headers = await this.buildHeaders(aiInvokerInput);

        const response = await fetch(endpointUrl, {
            method: "POST",
            headers,
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

    private async buildHeaders(aiInvokerInput: AIInvokerInput): Promise<HeadersInit> {
        const apiKey = this.tryGetOptionalSetting(aiInvokerInput, "apiKey");
        const commonHeaders: HeadersInit = {
            "Content-Type": "application/json"
        };

        if (apiKey) {
            return {
                ...commonHeaders,
                "api-key": apiKey
            };
        }

        const bearerToken = await this.getBearerTokenFromClientCredentials(aiInvokerInput);
        return {
            ...commonHeaders,
            Authorization: `Bearer ${bearerToken}`
        };
    }

    private async getBearerTokenFromClientCredentials(aiInvokerInput: AIInvokerInput): Promise<string> {
        const tenantId = this.tryGetOptionalSetting(aiInvokerInput, "tenantId");
        const clientId = this.tryGetOptionalSetting(aiInvokerInput, "clientId");
        const clientSecret = this.tryGetOptionalSetting(aiInvokerInput, "clientSecret");
        const authorityHost = this.tryGetOptionalSetting(aiInvokerInput, "authorityHost");

        if (!tenantId || !clientId || !clientSecret) {
            throw new Error(
                `Missing Azure authentication settings. Provide either "apiKey" or all of "tenantId", "clientId", and "clientSecret".`
            );
        }

        return this.azureClientCredentialsTokenProvider.getAccessToken({
            tenantId,
            clientId,
            clientSecret,
            authorityHost
        });
    }

    private tryGetRequiredSetting(aiInvokerInput: AIInvokerInput, settingName: string): string {
        const settingValue = this.tryGetOptionalSetting(aiInvokerInput, settingName);
        if (!settingValue) {
            throw new Error(`Missing required setting: ${settingName}`);
        }
        return settingValue;
    }

    private tryGetOptionalSetting(aiInvokerInput: AIInvokerInput, settingName: string): string | undefined {
        const rawSettingValue = aiInvokerInput.configuredModel.settings[settingName];
        const trimmedSettingValue = rawSettingValue?.trim();
        return trimmedSettingValue ? trimmedSettingValue : undefined;
    }

    private buildResponsesUrl(endpointBase: string, apiVersion: string): string {
        const normalizedEndpointBase = endpointBase.replace(/\/+$/, "");
        return `${normalizedEndpointBase}?api-version=${encodeURIComponent(apiVersion)}`;
    }

    private buildInputMessages(): Array<{ role: string; content: string }> {
        const messages = currentChatStorage.getMessages().map(message => {
            const role = message.role;
            const content = message.content;
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