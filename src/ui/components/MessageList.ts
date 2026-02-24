import { App, Component } from "obsidian";
import { ChatMessage } from "../../models/chat/ChatMessage";
import { ChatMessageRenderer } from "./ChatMessageRenderer";

interface MessageListRenderOptions {
    app: App;
    component: Component;
    sourcePath: string;
}

function formatMessageRole(chatMessage: ChatMessage): string {
    return chatMessage.role === "user" ? "You" : "Assistant";
}

function formatMessageTimestamp(chatMessage: ChatMessage): string {
    if (!chatMessage.timestamp) return "";
    return new Date(chatMessage.timestamp).toLocaleTimeString();
}

export function renderMessageList(
    container: HTMLElement,
    messages: ChatMessage[],
    messageListRenderOptions: MessageListRenderOptions
): void {
    const listElement = container.createDiv({ cls: "vault-wizard-message-list" });

    const chatMessageRenderer = new ChatMessageRenderer({
        app: messageListRenderOptions.app,
        component: messageListRenderOptions.component,
        sourcePath: messageListRenderOptions.sourcePath
    });

    for (const chatMessage of messages) {
        
        if (chatMessage.role === "system" || chatMessage.role === "developer") {
            continue;
        }

        const messageRowElement = listElement.createDiv({
            cls: `vault-wizard-message-row vault-wizard-message-row-${chatMessage.role}`
        });

        const messageBubbleElement = messageRowElement.createDiv({
            cls: `vault-wizard-message vault-wizard-${chatMessage.role}`
        });

        const messageMetaElement = messageBubbleElement.createDiv({ cls: "vault-wizard-message-meta" });
        messageMetaElement.createSpan({
            cls: "vault-wizard-message-role",
            text: formatMessageRole(chatMessage)
        });

        const timestampLabel = formatMessageTimestamp(chatMessage);
        if (timestampLabel) {
            messageMetaElement.createSpan({
                cls: "vault-wizard-message-time",
                text: timestampLabel
            });
        }

        const messageContentElement = messageBubbleElement.createDiv({
            cls: "vault-wizard-message-content markdown-rendered"
        });

        chatMessageRenderer.renderMarkdown(messageContentElement, chatMessage.content);
    }

    listElement.scrollTop = listElement.scrollHeight;
}