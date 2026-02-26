import { Notice, Plugin } from "obsidian";
import { VAULT_WIZARD_CHAT_PROTOCOL_ACTION, VIEW_TYPE_AI_HELPER } from "./constants";
import { ChatController } from "./controllers/ChatController";
import { ModelSettingsState } from "./services/state/ModelSettingsState";
import { NoteService } from "./services/context/NoteService";
import { selectedModelState } from "./services/state/SelectedModelState";
import { ChatView } from "./ui/chat/ChatView";
import { LLMController } from "./controllers/LLMController";
import { AIInvokerFactory } from "./llm/AIInvokerFactory";
import { AzureAIInvoker } from "./llm/invokers/azure/AzureAIInvoker";
import { ChatIdFactory } from "./services/chat/ChatIdFactory";
import { PersistenceController } from "./controllers/PersistenceController";
import { currentChatStorage } from "./services/chat/CurrentChatStorage";
import { debugTraceStorage } from "./services/debug/DebugTraceStorage";

export default class ObsidianAiHelperPlugin extends Plugin {
    private controller!: ChatController;

    async onload() {
        const noteService = new NoteService(this.app);
        const modelSettingsState = new ModelSettingsState(this.app);
        const azureAIInvoker = new AzureAIInvoker();
        const aiInvokerFactory = new AIInvokerFactory(azureAIInvoker);
        const llmController = new LLMController(selectedModelState, aiInvokerFactory);
        const chatIdFactory = new ChatIdFactory();

        const persistenceController = new PersistenceController({
            app: this.app,
            resolveConversationMessages: (chatId: string) => {
                if (currentChatStorage.chatId !== chatId) return null;
                return currentChatStorage.getMessages();
            },
            resolveConversationDebugTraces: (chatId: string) => {
                if (debugTraceStorage.getchatId() !== chatId) return null;
                return debugTraceStorage.getTraces();
            }
        });

        this.controller = new ChatController(
            noteService,
            llmController,
            modelSettingsState,
            selectedModelState,
            chatIdFactory,
            persistenceController
        );
        await this.controller.initialize();

        this.app.workspace.on("file-open", (file) => {
            if (!file) return;
            noteService.notifyFileOpened(file.path);
        });

        this.app.vault.on("modify", (file) => {
            if (!file) return;
            noteService.notifyFileModified(file.path);
        });

        this.registerDomEvent(document, "selectionchange", () => {
            noteService.captureSelectionFromActiveNote();
        });

        this.registerView(VIEW_TYPE_AI_HELPER, (leaf) => {
            return new ChatView(leaf, this.controller);
        });

        this.addRibbonIcon("message-square", "Toggle Vault Wizard Chat", async () => {
            await this.toggleChat();
        });

        this.addCommand({
            id: "toggle-vault-wizard-chat",
            name: "Toggle Vault Wizard Chat",
            callback: async () => {
                await this.toggleChat();
            }
        });

        this.addCommand({
            id: "vault-wizard-new-chat",
            name: "Vault Wizard New Chat",
            callback: async () => {
                await this.newChatCommand();
            }
        });

        
        this.registerObsidianProtocolHandler(VAULT_WIZARD_CHAT_PROTOCOL_ACTION, async (protocolParams) => {
            const chatId = protocolParams.chatId
            if (!chatId) {
                new Notice("Conversation not found");
                return;
            }

            await this.openChatView();

            const didOpenConversation = await this.controller.openConversationById(chatId);
            if (!didOpenConversation) {
                new Notice("Conversation not found");
            }
        });
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_AI_HELPER);
    }

    private async toggleChat(): Promise<void> {
        const chatLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_AI_HELPER);

        if (chatLeaves.length > 0) {
            chatLeaves.forEach((leaf) => leaf.detach());
            this.collapseRightSidebar();
            return;
        }

        await this.openChatView();
    }

    private collapseRightSidebar(): void {
        const workspaceWithRightSplit = this.app.workspace as unknown as {
            rightSplit?: { collapse?: () => void };
        };

        workspaceWithRightSplit.rightSplit?.collapse?.();
    }

    private async openChatView(): Promise<void> {
        const existingLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_AI_HELPER)[0];
        if (existingLeaf) {
            this.app.workspace.revealLeaf(existingLeaf);
            return;
        }

        const rightLeaf = this.app.workspace.getRightLeaf(false);
        if (!rightLeaf) {
            new Notice("Could not open Vault Wizard panel.");
            return;
        }

        await rightLeaf.setViewState({
            type: VIEW_TYPE_AI_HELPER,
            active: true
        });

        this.app.workspace.revealLeaf(rightLeaf);
    }

    private async newChatCommand(): Promise<void> {
        this.controller.resetChatAndStartNewConversation();
    }
}