import { ItemView, WorkspaceLeaf } from "obsidian";
import { VIEW_TYPE_AI_HELPER } from "../constants";
import { ChatController } from "../controllers/ChatController";
import { renderChatHeader } from "./components/ChatHeader";
import { renderMessageList } from "./components/MessageList";
import { renderChatComposer } from "./components/ChatComposer";
import { renderDebugPanel } from "./DebugPanel";
import { renderSettingsPanel } from "./SettingsPanel";
import { renderAddModelPanel } from "./AddModelPanel";

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

        renderChatHeader(
            contentEl,
            () => this.controller.openDebugPanel(),
            () => this.controller.openSettingsPanel()
        );

        renderMessageList(contentEl, this.controller.getMessages());
        renderChatComposer(
            contentEl,
            async (value) => this.controller.onUserMessage(value),
            this.controller.isStreaming()
        );
    }
}