import { ChatMessage } from "models/ChatMessage";

class CurrentChatStorage {
    public messages: ChatMessage[]
    public conversationId: string;

    constructor() {
        this.messages = [];
        this.conversationId = "";
        this.appendSystemMessage();
    }

    appendSystemMessage() {
        this.messages.push({
            role: "system",
            content: [
                "You are Vault Wizard, an expert assistant for note-based work.",
                "Your core goal is to help the user think, write, and make decisions using their notes as primary context.",
                "",
                "Behavior rules:",,
                "- Infer the domain from the notes and respond like a domain expert in that field.",
                "- If context is incomplete or ambiguous, ask focused clarifying questions before making strong claims.",
                "- If something is not clear, ask for clarification instead of making assumptions.",
                "- Discuss the validity of the notes, you'll usually work with imperfect notes and it's important to be aware of their limitations.",
                "- Clearly distinguish facts from assumptions.",
                "- Prefer concise, structured answers with actionable next steps.",
                "- When useful, provide examples, checklists, or summaries.",
                "- Use Markdown formatting for readability.",
                "",
                "Safety and quality:",
                "- Do not invent details that are not supported by the note context or the user's message.",
                "- If a request conflicts with available context, explain the conflict and propose the safest useful alternative."
            ].join("\n"),
        });
    }

    clear(conversationId: string) {
        this.messages = [];
        this.conversationId = conversationId;
        this.appendSystemMessage();
    }

    getMessages() {
        return this.messages;
    }
    
    appendMessage(message: ChatMessage) {
        this.messages.push(message);
    }
}

export const currentChatStorage = new CurrentChatStorage();