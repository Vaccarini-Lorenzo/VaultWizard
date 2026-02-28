import { PersistenceController } from "controllers/PersistenceController";
import { ChatMessage } from "models/chat/ChatMessage";
import { systemPromptService } from "services/context/SystemPromptService";

class CurrentChatStorage {
    public messages: ChatMessage[];
    public chatId: string;
    private persistenceController: PersistenceController | null;

    constructor() {
        this.messages = [];
        this.chatId = "";
        this.persistenceController = null;
    }

    setPersistenceController(persistenceController: PersistenceController) {
        this.persistenceController = persistenceController;
    }

    appendSystemMessage() {
        this.messages.push({
            role: "system",
            content: systemPromptService.getSystemPrompt(),
        });
    }

    async appendUserInfoMessage() {
        if (!this.persistenceController) {
            return;
        }

        const userBackgroundInformation = await this.persistenceController.getUserBackgroundInformations();
        if (!userBackgroundInformation){
            return;
        }

        this.messages.push({
            role: "developer",
            content: "<USER_INFO>\n" + userBackgroundInformation + "\n</USER_INFO>",
        });
    }

    async clear(chatId: string) {
        this.messages = [];
        this.chatId = chatId;
        this.appendSystemMessage();
        await this.appendUserInfoMessage();
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