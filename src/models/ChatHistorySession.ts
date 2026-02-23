import { ChatMessage } from "./ChatMessage";

export interface ChatHistorySession {
    conversationId: string;
    title: string;
    updatedAt: number;
    messages: ChatMessage[];
}