import { ChatMessage } from "./ChatMessage";
import { DebugTurnTrace } from "./DebugTurnTrace";

export interface ChatHistorySession {
    conversationId: string;
    title: string;
    updatedAt: number;
    messages: ChatMessage[];
    debugTraces: DebugTurnTrace[];
}