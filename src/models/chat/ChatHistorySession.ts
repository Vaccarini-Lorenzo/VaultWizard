import { DebugTurnTrace } from "models/debug/DebugTurnTrace";
import { ChatMessage } from "./ChatMessage";

export interface ChatHistorySession {
    chatId: string;
    title: string;
    updatedAt: number;
    messages: ChatMessage[];
    debugTraces: DebugTurnTrace[];
}