import { ConfiguredModel } from "../../models/llm/ConfiguredModel";
import { TokenUsage } from "../../models/llm/TokenUsage";

export interface AIInvokerInput {
    newUserMessage: string;
    configuredModel: ConfiguredModel;
}

export interface AIInvokerResult {
    tokenUsage?: TokenUsage;
}

export interface AIInvoker {
    streamResponse(
        aiInvokerInput: AIInvokerInput,
        onChunk: (chunk: string) => void
    ): Promise<AIInvokerResult>;
}