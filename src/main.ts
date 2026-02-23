import { Notice, Plugin } from "obsidian";
import { VIEW_TYPE_AI_HELPER } from "./constants";
import { ChatController } from "./controllers/ChatController";
import { ChatService } from "./services/ChatService";
import { ModelSettingsRepository } from "./services/ModelSettingsRepository";
import { NoteService } from "./services/NoteService";
import { selectedModelState } from "./state/SelectedModelState";
import { ChatView } from "./ui/ChatView";
import { LLMController } from "./controllers/LLMController";
import { AIInvokerFactory } from "./llm/AIInvokerFactory";
import { AzureAIInvoker } from "./llm/invokers/azure/AzureAIInvoker";
import { ConversationIdFactory } from "./services/ConversationIdFactory";

export default class ObsidianAiHelperPlugin extends Plugin {
    private controller!: ChatController;

    async onload() {
        const noteService = new NoteService(this.app);
        const modelSettingsRepository = new ModelSettingsRepository(this.app);

        const azureAIInvoker = new AzureAIInvoker();
        const aiInvokerFactory = new AIInvokerFactory(azureAIInvoker);
        const llmController = new LLMController(selectedModelState, aiInvokerFactory);
        const conversationIdFactory = new ConversationIdFactory();

        this.controller = new ChatController(
            noteService,
            llmController,
            modelSettingsRepository,
            selectedModelState,
            conversationIdFactory
        );
        await this.controller.initialize();

        this.app.workspace.on("file-open", (file) => {
            if (!file) return;
            noteService.notifyFileOpened(file.path);
        });

        this.app.vault.on("modify", (file) => {
            if (!file) return;
            noteService.notifyFileModified(file.path);
        })

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
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_AI_HELPER);
    }

    private async toggleChat(): Promise<void> {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_AI_HELPER);

        if (leaves.length > 0) {
            leaves.forEach((leaf) => leaf.detach());
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