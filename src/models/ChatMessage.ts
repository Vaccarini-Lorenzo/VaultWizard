export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface ChatMessage {
    role: ChatRole;
    content: string;
    timestamp?: number;
}