import { TokenUsage } from "./TokenUsage";

export interface DebugTurnTrace {
    timestamp: number;
    userPrompt: string;
    context: string;
    assistantResponse: string;
    tokenUsage: TokenUsage | null;
}