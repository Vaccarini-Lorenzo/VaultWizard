import { DebugTurnTrace } from "models/debug/DebugTurnTrace";
import { ChatMessage } from "../chat/ChatMessage";


export interface LocalChatPersistenceProviderOptions {
    folderPath?: string;
    resolveConversationMessages: (chatId: string) => readonly ChatMessage[] | null;
    resolveConversationDebugTraces: (chatId: string) => readonly DebugTurnTrace[] | null;
}