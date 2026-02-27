import { ChatMessage } from "models/chat/ChatMessage";
import { systemPromptService } from "services/context/SystemPromptService";

class CurrentChatStorage {
    public messages: ChatMessage[];
    public chatId: string;

    constructor() {
        this.messages = [];
        this.chatId = "";
        this.appendSystemMessage();
    }

    appendSystemMessage() {
        this.messages.push({
            role: "system",
            content: systemPromptService.getSystemPrompt(),
        });
    }

    clear(chatId: string) {
        this.messages = [];
        this.chatId = chatId;
        this.appendSystemMessage();
    }

    replaceConversation(chatId: string, messages: readonly ChatMessage[]): void {
        this.chatId = chatId;
        this.messages = messages.map((chatMessage) => ({ ...chatMessage }));

        const hasSystemMessage = this.messages.some((chatMessage) => chatMessage.role === "system");
        if (!hasSystemMessage) {
            this.appendSystemMessage();
        }
    }

    getMessages() {
        return this.messages;
    }

    appendMessage(message: ChatMessage) {
        this.messages.push(message);
    }
}

export const currentChatStorage = new CurrentChatStorage();