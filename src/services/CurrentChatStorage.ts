import { ChatMessage } from "models/ChatMessage";

class CurrentChatStorage {
    public messages: ChatMessage[]
    public conversationId: string;

    constructor() {
        this.messages = [];
        this.conversationId = "";
    }

    clear(conversationId: string) {
        this.messages = [];
        this.conversationId = conversationId;
    }

    getMessages() {
        return this.messages;
    }
    
    appendMessage(message: ChatMessage) {
        this.messages.push(message);
    }
}

export const currentChatStorage = new CurrentChatStorage();