import { ChatMessage } from "../models/ChatMessage";
import { NoteService } from "../services/NoteService";
import { ChatService } from "../services/ChatService";

type Listener = () => void;

export class ChatController {
    private readonly listeners = new Set<Listener>();
    private readonly messages: ChatMessage[] = [];
    private debugVisible = false;
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

    isDebugVisible(): boolean {
        return this.debugVisible;
    }

    isStreaming(): boolean {
        return this.streaming;
    }

    getActiveNotePath(): string {
        return this.noteService.getActiveNotePath();
    }

    toggleDebug() {
        this.debugVisible = !this.debugVisible;
        this.notify();
    }

    async onUserMessage(rawInput: string): Promise<void> {
        const input = rawInput.trim();
        if (!input || this.streaming) return;

        // special slash command
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

    private notify() {
        for (const listener of this.listeners) listener();
    }
}