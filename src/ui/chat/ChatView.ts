import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_AI_HELPER } from "../../constants";
import { ChatController } from "../../controllers/ChatController";
import { renderDebugPanel } from "../debug/DebugPanel";
import { renderChatComposer } from "./ChatComposer";
import { renderChatHeader } from "./ChatHeader";
import { renderSelectedContextBadge } from "./SelectedContextBadge";
import { renderChatHistorySidebar } from "../chat_history/ChatHistorySidebar";
import { currentChatStorage } from "services/chat/CurrentChatStorage";
import { selectedContextStorage } from "services/context/SelectedContextStorage";
import { renderSettingsPanel } from "ui/settings/SettingsPanel";
import { renderAddModelPanel } from "ui/settings/AddModelPanel";
import { MessageListViewUpdater } from "./MessageList";
import { UiPanel } from "../../models/misc/UiPanel";
import { ChatHistorySidebarViewUpdater } from "../chat_history/ChatHistorySidebarViewUpdater";

export class ChatView extends ItemView {
    private unsubscribe?: () => void;
    private unsubscribeSelection?: () => void;
    private historySidebarOpen = false;
    private isOpen = false;
    private renderFrameHandle: number | null = null;

    private renderedPanel: UiPanel | null = null;
    private chatHeaderShellElement: HTMLElement | null = null;
    private chatBodyShellElement: HTMLElement | null = null;
    private chatMainElement: HTMLElement | null = null;
    private selectedContextBadgeShellElement: HTMLElement | null = null;
    private composerShellElement: HTMLElement | null = null;
    private historyOverlayElement: HTMLElement | null = null;
    private messageListViewUpdater: MessageListViewUpdater | null = null;
    private historySidebarViewUpdater: ChatHistorySidebarViewUpdater | null = null;

    constructor(
        leaf: WorkspaceLeaf,
        private readonly controller: ChatController
    ) {
        super(leaf);
    }

    getViewType(): string {
        return VIEW_TYPE_AI_HELPER;
    }

    getOpenStatus(): boolean {
        return this.isOpen;
    }

    setOpenStatus(isOpen: boolean): void {
        this.isOpen = isOpen;
    }

    getDisplayText(): string {
        return "Vault Wizard Chat";
    }

    getIcon(): string {
        return "bot";
    }

    async onOpen() {
        this.unsubscribe = this.controller.subscribe(() => this.scheduleRender());
        this.unsubscribeSelection = selectedContextStorage.subscribe(() => this.scheduleRender());
        this.scheduleRender();
    }

    async onClose() {
        this.unsubscribe?.();
        this.unsubscribeSelection?.();

        if (this.renderFrameHandle !== null) {
            cancelAnimationFrame(this.renderFrameHandle);
            this.renderFrameHandle = null;
        }
    }

    private scheduleRender(): void {
        if (this.renderFrameHandle !== null) return;

        this.renderFrameHandle = requestAnimationFrame(() => {
            this.renderFrameHandle = null;
            this.render();
        });
    }

    private render(): void {
        const activePanel = this.controller.getActivePanel();

        if (activePanel !== "chat") {
            this.renderNonChatPanel(activePanel);
            return;
        }

        this.ensureChatLayout();
        this.renderChatHeader();
        this.renderChatMain();
    }

    private renderNonChatPanel(activePanel: UiPanel): void {
        if (this.renderedPanel !== activePanel) {
            this.resetViewRoot();
            this.renderedPanel = activePanel;
        }

        if (activePanel === "debug") {
            renderDebugPanel(this.contentEl, this.controller);
            return;
        }

        if (activePanel === "settings") {
            renderSettingsPanel(this.contentEl, this.controller);
            return;
        }

        if (activePanel === "add-model") {
            renderAddModelPanel(this.contentEl, this.controller);
        }
    }

    private ensureChatLayout(): void {
        if (this.renderedPanel !== "chat") {
            this.resetViewRoot();
            this.contentEl.addClass("vault-wizard-root");

            this.chatHeaderShellElement = this.contentEl.createDiv({ cls: "vault-wizard-chat-header-shell" });

            this.chatBodyShellElement = this.contentEl.createDiv({
                cls: `vault-wizard-chat-body-shell ${this.historySidebarOpen ? "is-history-open" : ""}`
            });

            this.chatMainElement = this.chatBodyShellElement.createDiv({ cls: "vault-wizard-chat-main" });

            const messageListShellElement = this.chatMainElement.createDiv({
                cls: "vault-wizard-message-list-shell"
            });
            this.messageListViewUpdater = new MessageListViewUpdater(messageListShellElement);

            this.selectedContextBadgeShellElement = this.chatMainElement.createDiv({
                cls: "vault-wizard-selected-context-badge-shell"
            });

            this.composerShellElement = this.chatMainElement.createDiv({
                cls: "vault-wizard-chat-composer-shell"
            });

            this.renderedPanel = "chat";
            return;
        }

        if (this.chatBodyShellElement) {
            this.chatBodyShellElement.classList.toggle("is-history-open", this.historySidebarOpen);
        }
    }

    private renderChatHeader(): void {
        if (!this.chatHeaderShellElement) return;

        this.chatHeaderShellElement.empty();
        const selectedConfiguredModel = this.controller.getSelectedConfiguredModel();

        renderChatHeader(
            this.chatHeaderShellElement,
            () => this.controller.openDebugPanel(),
            () => this.controller.openSettingsPanel(),
            this.controller.getConfiguredModels(),
            selectedConfiguredModel?.id ?? null,
            (configuredModelId) => this.controller.selectConfiguredModelById(configuredModelId),
            () => {
                const didInsertConversationReference = this.controller.embedCurrentConversationReferenceInActiveNote();

                if (!didInsertConversationReference) {
                    new Notice("No active editor");
                    return;
                }

                new Notice("Conversation reference inserted");
            },
            () => this.controller.resetChatAndStartNewConversation(),
            () => {
                this.historySidebarOpen = !this.historySidebarOpen;
                this.scheduleRender();
            }
        );
    }

    private renderChatMain(): void {
        if (!this.chatMainElement || !this.messageListViewUpdater) return;

        this.messageListViewUpdater.sync(currentChatStorage.getMessages(), {
            app: this.app,
            component: this,
            sourcePath: this.controller.getActiveNotePath(),
            isStreaming: this.controller.isStreaming()
        });

        if (this.selectedContextBadgeShellElement) {
            this.selectedContextBadgeShellElement.empty();
            renderSelectedContextBadge(
                this.selectedContextBadgeShellElement,
                selectedContextStorage.getSelection()
            );
        }

        if (this.composerShellElement) {
            this.composerShellElement.empty();
            renderChatComposer(
                this.composerShellElement,
                async (value) => {
                    await this.controller.onUserMessage(value);
                },
                this.controller.isStreaming()
            );
        }

        this.renderHistorySidebar();
    }

    private renderHistorySidebar(): void {
        if (!this.chatBodyShellElement) return;

        if (!this.historySidebarOpen) {
            this.historyOverlayElement?.remove();
            this.historyOverlayElement = null;
            this.historySidebarViewUpdater = null;
            return;
        }

        if (!this.historyOverlayElement) {
            this.historyOverlayElement = this.chatBodyShellElement.createDiv({
                cls: "vault-wizard-history-overlay"
            });

            this.historySidebarViewUpdater = new ChatHistorySidebarViewUpdater(
                this.historyOverlayElement,
                (chatId) => {
                    this.controller.openConversationFromHistory(chatId);
                    this.historySidebarOpen = false;
                    this.scheduleRender();
                }
            );
        }

        this.historySidebarViewUpdater?.sync({
            sessions: this.controller.getChatHistorySessions(),
            activeChatId: this.controller.getchatId()
        });
    }

    private resetViewRoot(): void {
        this.contentEl.empty();
        this.contentEl.addClass("vault-wizard-root");

        this.chatHeaderShellElement = null;
        this.chatBodyShellElement = null;
        this.chatMainElement = null;
        this.selectedContextBadgeShellElement = null;
        this.composerShellElement = null;
        this.historyOverlayElement = null;
        this.historySidebarViewUpdater = null;
        this.messageListViewUpdater = null;
    }
}