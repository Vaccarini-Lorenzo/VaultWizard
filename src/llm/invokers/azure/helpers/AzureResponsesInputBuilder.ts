import { ChatMessage } from "models/ChatMessage";
import { currentChatStorage } from "../../../../services/CurrentChatStorage";
import { AIInvokerInput } from "../../AIInvoker";

export class AzureResponsesInputBuilder {
    build(aiInvokerInput: AIInvokerInput): ChatMessage[] {
        const conversationHistoryMessages = currentChatStorage.getMessages();

        const inputItems: ChatMessage[] = conversationHistoryMessages
            .map((chatMessage) => this.toInputItem(chatMessage))
            .filter((item): item is ChatMessage => item !== null);

        const latestUserMessage = this.tryGetUserMessage(aiInvokerInput);
        if (latestUserMessage) {
            inputItems.push({
                role: "user",
                content: latestUserMessage
            });
        }

        return inputItems;
    }

    private toInputItem(chatMessage: ChatMessage): ChatMessage | null {
        const role = (chatMessage as unknown as Record<string, unknown>).role;
        const content = (chatMessage as unknown as Record<string, unknown>).content;

        if (typeof role !== "string" || typeof content !== "string" || !content.trim()) {
            return null;
        }

        if (role !== "system" && role !== "user" && role !== "assistant") {
            return null;
        }

        return { role, content };
    }

    private tryGetUserMessage(aiInvokerInput: AIInvokerInput): string {
        const unknownInput = aiInvokerInput as unknown as Record<string, unknown>;
        const userMessageKeys = ["userMessage", "prompt", "message"];

        for (const userMessageKey of userMessageKeys) {
            const value = unknownInput[userMessageKey];
            if (typeof value === "string" && value.trim()) {
                return value;
            }
        }

        return "";
    }
}