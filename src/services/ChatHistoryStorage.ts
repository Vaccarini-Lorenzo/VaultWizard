import { ChatHistorySession } from "../models/ChatHistorySession";
import { ChatMessage } from "../models/ChatMessage";
import { DebugTurnTrace } from "../models/DebugTurnTrace";

class ChatHistoryStorage {
    private readonly chatHistorySessions: ChatHistorySession[] = [];

    archiveConversation(
        conversationId: string,
        messages: readonly ChatMessage[],
        debugTraces: readonly DebugTurnTrace[] = []
    ): void {
        const sanitizedMessages = messages.map((chatMessage) => ({ ...chatMessage }));
        const sanitizedDebugTraces = debugTraces.map((debugTrace) => ({ ...debugTrace }));
        const sessionTitle = this.buildSessionTitle(sanitizedMessages);

        const nextSession: ChatHistorySession = {
            conversationId,
            title: sessionTitle,
            updatedAt: Date.now(),
            messages: sanitizedMessages,
            debugTraces: sanitizedDebugTraces
        };

        const existingSessionIndex = this.chatHistorySessions.findIndex(
            (chatHistorySession) => chatHistorySession.conversationId === conversationId
        );

        if (existingSessionIndex >= 0) {
            this.chatHistorySessions.splice(existingSessionIndex, 1, nextSession);
            return;
        }

        this.chatHistorySessions.push(nextSession);
    }

    getSessions(): readonly ChatHistorySession[] {
        return [...this.chatHistorySessions].sort((firstSession, secondSession) => {
            return secondSession.updatedAt - firstSession.updatedAt;
        });
    }

    getSessionByConversationId(conversationId: string): ChatHistorySession | null {
        const foundSession = this.chatHistorySessions.find(
            (chatHistorySession) => chatHistorySession.conversationId === conversationId
        );

        if (!foundSession) return null;

        return {
            ...foundSession,
            messages: foundSession.messages.map((chatMessage) => ({ ...chatMessage })),
            debugTraces: foundSession.debugTraces.map((debugTrace) => ({ ...debugTrace }))
        };
    }

    private buildSessionTitle(messages: readonly ChatMessage[]): string {
        const firstUserMessage = messages.find((chatMessage) => chatMessage.role === "user");
        if (!firstUserMessage?.content?.trim()) {
            return "Untitled chat";
        }

        const normalizedTitle = firstUserMessage.content.trim().replace(/\s+/g, " ");
        if (normalizedTitle.length <= 42) return normalizedTitle;
        return `${normalizedTitle.slice(0, 42)}…`;
    }
}

export const chatHistoryStorage = new ChatHistoryStorage();