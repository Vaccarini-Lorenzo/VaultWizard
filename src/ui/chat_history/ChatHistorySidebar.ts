import { setIcon } from "obsidian";
import { ChatHistorySession } from "../../models/chat/ChatHistorySession";

interface ChatHistorySidebarRenderOptions {
    sessions: readonly ChatHistorySession[];
    activeChatId: string;
    onSelectConversation: (chatId: string) => void;
    onDeleteConversation?: (chatId: string) => void;
}

function formatHistoryTimestamp(updatedAt: number): string {
    return new Date(updatedAt).toLocaleString();
}

function sortSessionsByLastMessageDate(
    chatHistorySessions: readonly ChatHistorySession[]
): ChatHistorySession[] {
    return [...chatHistorySessions].sort((firstSession, secondSession) => {
        return secondSession.updatedAt - firstSession.updatedAt;
    });
}

export function renderChatHistorySidebar(
    container: HTMLElement,
    chatHistorySidebarRenderOptions: ChatHistorySidebarRenderOptions
): void {
    const sidebarElement = container.createDiv({ cls: "vault-wizard-history-sidebar" });

    const headerElement = sidebarElement.createDiv({ cls: "vault-wizard-history-header" });
    headerElement.createEl("h4", {
        cls: "vault-wizard-history-title",
        text: "Older chats"
    });

    const listElement = sidebarElement.createDiv({ cls: "vault-wizard-history-list" });

    const sortedChatHistorySessions = sortSessionsByLastMessageDate(
        chatHistorySidebarRenderOptions.sessions
    );

    if (sortedChatHistorySessions.length === 0) {
        listElement.createDiv({
            cls: "vault-wizard-history-empty",
            text: "No previous chats yet."
        });
        return;
    }

    for (const chatHistorySession of sortedChatHistorySessions) {
        const isActiveSession =
            chatHistorySession.chatId === chatHistorySidebarRenderOptions.activeChatId;

        const rowElement = listElement.createEl("button", {
            cls: `vault-wizard-history-item ${isActiveSession ? "is-active" : ""}`
        });

        const contentElement = rowElement.createDiv({ cls: "vault-wizard-history-item-content" });
        contentElement.createDiv({
            cls: "vault-wizard-history-item-title",
            text: chatHistorySession.title
        });

        contentElement.createDiv({
            cls: "vault-wizard-history-item-time",
            text: formatHistoryTimestamp(chatHistorySession.updatedAt)
        });

        const deleteButton = rowElement.createEl("button", {
            cls: "vault-wizard-history-item-delete",
            attr: {
                type: "button",
                "aria-label": "Delete chat",
                title: "Delete chat"
            }
        });
        setIcon(deleteButton, "trash");

        deleteButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            if (typeof chatHistorySidebarRenderOptions.onDeleteConversation === "function") {
                chatHistorySidebarRenderOptions.onDeleteConversation(chatHistorySession.chatId);
            }
        });

        rowElement.addEventListener("click", () => {
            chatHistorySidebarRenderOptions.onSelectConversation(chatHistorySession.chatId);
        });
    }
}