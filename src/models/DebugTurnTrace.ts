import { TokenUsage } from "./TokenUsage";

export interface DebugRequestDetails {
    prompt: string;
    context: string;
    selectedContext: string | null;
}

export interface DebugResponseMetadata {
    conversationId: string;
    provider: string | null;
    modelName: string | null;
    configuredModelId: string | null;
    completedAt: number;
    hadError: boolean;
    errorMessage: string | null;
}

export interface DebugTurnTrace {
    timestamp: number;
    userPrompt: string;
    context: string;
    assistantResponse: string;
    tokenUsage: TokenUsage | null;
    request: DebugRequestDetails;
    responseMetadata: DebugResponseMetadata;
}