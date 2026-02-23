import { ChatMessage } from "../models/ChatMessage";

export interface PersistedConversation {
    conversationId: string;
    title: string;
    updatedAt: number;
    messages: ChatMessage[];
}

export interface ChatPersistenceProvider {
    getMostRecent(maxConversationCount: number): Promise<readonly PersistedConversation[]>;
    update(conversationId: string): Promise<void>;
    get(conversationId: string): Promise<PersistedConversation | null>;
}