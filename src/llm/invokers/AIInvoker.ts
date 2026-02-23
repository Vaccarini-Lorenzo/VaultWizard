import { ConfiguredModel } from "../../models/ConfiguredModel";

export interface AIInvokerInput {
    newUserMessage: string;
    context?: string;
    configuredModel: ConfiguredModel;
}

export interface AIInvoker {
    streamResponse(
        aiInvokerInput: AIInvokerInput,
        onChunk: (chunk: string) => void
    ): Promise<void>;
}