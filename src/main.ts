import { Notice, Plugin } from "obsidian";
import { VIEW_TYPE_AI_HELPER } from "./constants";
import { ChatView } from "./ui/ChatView";
import { NoteService } from "./services/NoteService";
import { ChatService } from "./services/ChatService";
import { ChatController } from "./controllers/ChatController";

export default class ObsidianAiHelperPlugin extends Plugin {
    private controller!: ChatController;

    async onload() {
        const noteService = new NoteService(this.app);
        const chatService = new ChatService();
        this.controller = new ChatController(noteService, chatService);

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
}