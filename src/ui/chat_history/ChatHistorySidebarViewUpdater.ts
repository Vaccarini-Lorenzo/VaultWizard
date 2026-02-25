import { ChatHistorySession } from "../../models/chat/ChatHistorySession";
import { renderChatHistorySidebar } from "./ChatHistorySidebar";

interface ChatHistorySidebarSnapshot {
    sessions: readonly ChatHistorySession[];
    activeChatId: string;
}

export class ChatHistorySidebarViewUpdater {
    private lastSnapshotSignature: string | null = null;

    constructor(
        private readonly container: HTMLElement,
        private readonly onSelectConversation: (chatId: string) => void
    ) {}

    sync(snapshot: ChatHistorySidebarSnapshot): void {
        const nextSnapshotSignature = this.buildSnapshotSignature(snapshot);
        if (nextSnapshotSignature === this.lastSnapshotSignature) return;

        this.lastSnapshotSignature = nextSnapshotSignature;
        this.container.empty();

        renderChatHistorySidebar(this.container, {
            sessions: snapshot.sessions,
            activeChatId: snapshot.activeChatId,
            onSelectConversation: this.onSelectConversation
        });
    }

    private buildSnapshotSignature(snapshot: ChatHistorySidebarSnapshot): string {
        const sessionSignature = snapshot.sessions
            .map((session) => `${session.chatId}:${session.updatedAt}:${session.title}`)
            .join("|");

        return `${snapshot.activeChatId}::${sessionSignature}`;
    }
}