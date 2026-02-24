import { ChatMessage } from "../../models/chat/ChatMessage";
import { DebugTurnTrace } from "../../models/debug/DebugTurnTrace";

export interface PersistedConversation {
    chatId: string;
    title: string;
    updatedAt: number;
    messages: ChatMessage[];
    debugTraces: DebugTurnTrace[];
}

export interface ChatPersistenceProvider {
    getMostRecent(maxConversationCount: number): Promise<readonly PersistedConversation[]>;
    update(chatId: string): Promise<void>;
    get(chatId: string): Promise<PersistedConversation | null>;
}