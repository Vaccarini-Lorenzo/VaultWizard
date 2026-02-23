import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_AI_HELPER } from "../constants";
import { ChatController } from "../controllers/ChatController";
import { renderAddModelPanel } from "./AddModelPanel";
import { renderDebugPanel } from "./DebugPanel";
import { renderSettingsPanel } from "./SettingsPanel";
import { renderChatComposer } from "./components/ChatComposer";
import { renderChatHeader } from "./components/ChatHeader";
import { renderMessageList } from "./components/MessageList";
import { currentChatStorage } from "services/CurrentChatStorage";

export class ChatView extends ItemView {
    private unsubscribe?: () => void;

    constructor(
        leaf: WorkspaceLeaf,
        private readonly controller: ChatController
    ) {
        super(leaf);
    }

    getViewType(): string {
        return VIEW_TYPE_AI_HELPER;
    }

    getDisplayText(): string {
        return "Vault Wizard Chat";
    }

    getIcon(): string {
        return "bot";
    }

    async onOpen() {
        this.unsubscribe = this.controller.subscribe(() => this.render());
        this.render();
    }

    async onClose() {
        this.unsubscribe?.();
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

        renderChatHeader(
            contentEl,
            () => this.controller.openDebugPanel(),
            () => this.controller.openSettingsPanel(),
            this.controller.getConfiguredModels(),
            selectedConfiguredModel?.id ?? null,
            (configuredModelId) => this.controller.selectConfiguredModelById(configuredModelId),
            () => this.controller.resetChatAndStartNewConversation()
        );

        renderMessageList(contentEl, currentChatStorage.getMessages(), {
            app: this.app,
            component: this,
            sourcePath: this.controller.getActiveNotePath()
        });

        renderChatComposer(
            contentEl,
            async (value) => this.controller.onUserMessage(value),
            this.controller.isStreaming()
        );
    }
}