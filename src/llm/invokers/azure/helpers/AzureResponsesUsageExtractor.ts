import { TokenUsage } from "../../../../models/llm/TokenUsage";

export class AzureResponsesUsageExtractor {
    extract(payload: unknown): TokenUsage | null {
        const payloadRecord = payload as Record<string, any>;
        const usageRecord =
            payloadRecord?.usage ??
            payloadRecord?.response?.usage ??
            payloadRecord?.data?.usage ??
            null;

        if (!usageRecord || typeof usageRecord !== "object") {
            return null;
        }

        const inputTokens = this.toNonNegativeNumber(
            usageRecord.input_tokens ?? usageRecord.prompt_tokens ?? usageRecord.inputTokens
        );

        const outputTokens = this.toNonNegativeNumber(
            usageRecord.output_tokens ?? usageRecord.completion_tokens ?? usageRecord.outputTokens
        );

        const cachedInputTokens = this.toNonNegativeNumber(
            usageRecord.cached_input_tokens ??
                usageRecord.cached_tokens ??
                usageRecord?.input_tokens_details?.cached_tokens ??
                usageRecord?.prompt_tokens_details?.cached_tokens
        );

        if (inputTokens === null && outputTokens === null && cachedInputTokens === null) {
            return null;
        }

        return {
            inputTokens: inputTokens ?? 0,
            outputTokens: outputTokens ?? 0,
            cachedInputTokens: cachedInputTokens ?? 0
        };
    }

    private toNonNegativeNumber(value: unknown): number | null {
        if (typeof value !== "number" || !Number.isFinite(value)) return null;
        if (value < 0) return null;
        return value;
    }
}