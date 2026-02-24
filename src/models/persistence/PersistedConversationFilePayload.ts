import { ChatMessage } from "../chat/ChatMessage";
import { DebugTurnTrace } from "./DebugTurnTrace";

export interface PersistedConversationFilePayload {
    chatId: string;
    title: string;
    updatedAt: number;
    messages: ChatMessage[];
    debugTraces?: DebugTurnTrace[];
}