export type ChatRole = "user" | "assistant" | "system" | "developer";

export interface ChatMessage {
    role: ChatRole;
    content: string;
    timestamp?: number;
}