import { TokenUsage } from "models/llm/TokenUsage";


export interface DebugResponseMetadata {
    chatId: string;
    provider: string | null;
    modelName: string | null;
    configuredModelId: string | null;
    completedAt: number;
    hadError: boolean;
    errorMessage: string | null;
}

export interface DebugTurnTrace {
    timestamp: number;
    systemPrompt: string;
    userPrompt: string;
    context: string;
    assistantResponse: string;
    tokenUsage: TokenUsage | null;
    responseMetadata: DebugResponseMetadata;
}