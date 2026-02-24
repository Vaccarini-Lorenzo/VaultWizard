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
import { renderMessageList } from "./MessageList";


export class ChatView extends ItemView {
    private unsubscribe?: () => void;
    private unsubscribeSelection?: () => void;
    private historySidebarOpen = false;
    private isOpen = false;

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
        this.unsubscribe = this.controller.subscribe(() => this.render());
        this.unsubscribeSelection = selectedContextStorage.subscribe(() => this.render());
        this.render();
    }

    async onClose() {
        this.unsubscribe?.();
        this.unsubscribeSelection?.();
    }

    private render() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("vault-wizard-root");

        const activePanel = this.controller.getActivePanel();

        if (activePanel === "debug") {
            renderDebugPanel(contentEl, this.controller);
            return;
        }

        if (activePanel === "settings") {
            renderSettingsPanel(contentEl, this.controller);
            return;
        }

        if (activePanel === "add-model") {
            renderAddModelPanel(contentEl, this.controller);
            return;
        }

        const selectedConfiguredModel = this.controller.getSelectedConfiguredModel();

        const chatHeaderShellElement = contentEl.createDiv({ cls: "vault-wizard-chat-header-shell" });
        renderChatHeader(
            chatHeaderShellElement,
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
                this.render();
            }
        );

        const chatBodyShellElement = contentEl.createDiv({
            cls: `vault-wizard-chat-body-shell ${this.historySidebarOpen ? "is-history-open" : ""}`
        });

        const chatMainElement = chatBodyShellElement.createDiv({ cls: "vault-wizard-chat-main" });

        renderMessageList(chatMainElement, currentChatStorage.getMessages(), {
            app: this.app,
            component: this,
            sourcePath: this.controller.getActiveNotePath()
        });

        renderSelectedContextBadge(chatMainElement, selectedContextStorage.getSelection());

        renderChatComposer(
            chatMainElement,
            async (value) => {
                await this.controller.onUserMessage(value);
            },
            this.controller.isStreaming()
        );

        if (this.historySidebarOpen) {
            const historyOverlayElement = chatBodyShellElement.createDiv({
                cls: "vault-wizard-history-overlay"
            });

            renderChatHistorySidebar(historyOverlayElement, {
                sessions: this.controller.getChatHistorySessions(),
                activechatId: this.controller.getchatId(),
                onSelectConversation: (chatId) => {
                    this.controller.openConversationFromHistory(chatId);
                    this.historySidebarOpen = false;
                    this.render();
                }
            });
        }
    }
}