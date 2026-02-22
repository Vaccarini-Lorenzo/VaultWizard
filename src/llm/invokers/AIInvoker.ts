import { ConfiguredModel } from "../../models/ConfiguredModel";

export interface AIInvokerInput {
    userMessage: string;
    configuredModel: ConfiguredModel;
}

export interface AIInvoker {
    streamResponse(
        aiInvokerInput: AIInvokerInput,
        onChunk: (chunk: string) => void
    ): Promise<void>;
}