import { ChatMessage } from "../models/ChatMessage";
import { NoteService } from "../services/NoteService";
import { ChatService } from "../services/ChatService";
import { UiPanel } from "../models/UiPanel";
import { ConfiguredModel } from "../models/ConfiguredModel";

type Listener = () => void;

export class ChatController {
    private readonly listeners = new Set<Listener>();
    private readonly messages: ChatMessage[] = [];
    private readonly configuredModels: ConfiguredModel[] = [];

    private activePanel: UiPanel = "chat";
    private streaming = false;

    constructor(
        private readonly noteService: NoteService,
        private readonly chatService: ChatService
    ) {}

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getMessages(): ChatMessage[] {
        return this.messages;
    }

    getConfiguredModels(): readonly ConfiguredModel[] {
        return this.configuredModels;
    }

    getActivePanel(): UiPanel {
        return this.activePanel;
    }

    isStreaming(): boolean {
        return this.streaming;
    }

    getActiveNotePath(): string {
        return this.noteService.getActiveNotePath();
    }

    openChatPanel(): void {
        this.setActivePanel("chat");
    }

    openDebugPanel(): void {
        this.setActivePanel("debug");
    }

    openSettingsPanel(): void {
        this.setActivePanel("settings");
    }

    openAddModelPanel(): void {
        this.setActivePanel("add-model");
    }

    returnToSettingsPanel(): void {
        this.setActivePanel("settings");
    }

    async onUserMessage(rawInput: string): Promise<void> {
        const input = rawInput.trim();
        if (!input || this.streaming) return;

        if (input === "/c") {
            const content = await this.noteService.getActiveNoteContent();
            this.messages.push({
                role: "assistant",
                content,
                timestamp: Date.now()
            });
            this.notify();
            return;
        }

        this.messages.push({
            role: "user",
            content: input,
            timestamp: Date.now()
        });

        const assistantMessage: ChatMessage = {
            role: "assistant",
            content: "",
            timestamp: Date.now()
        };
        this.messages.push(assistantMessage);
        this.streaming = true;
        this.notify();

        await this.chatService.streamEcho(input, (chunk) => {
            assistantMessage.content += chunk;
            this.notify();
        });

        this.streaming = false;
        this.notify();
    }

    private setActivePanel(nextPanel: UiPanel): void {
        if (this.activePanel === nextPanel) return;
        this.activePanel = nextPanel;
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }
}