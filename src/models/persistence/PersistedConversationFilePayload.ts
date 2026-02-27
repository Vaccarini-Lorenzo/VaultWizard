import { DebugTurnTrace } from "models/debug/DebugTurnTrace";
import { ChatMessage } from "../chat/ChatMessage";


export interface PersistedConversationFilePayload {
    chatId: string;
    title: string;
    updatedAt: number;
    messages: ChatMessage[];
    debugTraces?: DebugTurnTrace[];
}