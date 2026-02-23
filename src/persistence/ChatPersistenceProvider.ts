import { ChatMessage } from "../models/ChatMessage";
import { DebugTurnTrace } from "../models/DebugTurnTrace";

export interface PersistedConversation {
    conversationId: string;
    title: string;
    updatedAt: number;
    messages: ChatMessage[];
    debugTraces: DebugTurnTrace[];
}

export interface ChatPersistenceProvider {
    getMostRecent(maxConversationCount: number): Promise<readonly PersistedConversation[]>;
    update(conversationId: string): Promise<void>;
    get(conversationId: string): Promise<PersistedConversation | null>;
}