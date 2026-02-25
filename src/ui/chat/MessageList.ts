import { App, Component } from "obsidian";
import { ChatMessage } from "../../models/chat/ChatMessage";
import { ChatMessageRenderer } from "../chat/ChatMessageRenderer";

export interface MessageListRenderOptions {
    app: App;
    component: Component;
    sourcePath: string;
    isStreaming: boolean;
}

interface RenderedMessageEntry {
    role: ChatMessage["role"];
    timestamp?: number;
    content: string;
    contentElement: HTMLElement;
    renderedAsPlainText: boolean;
}

const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 56;

function formatMessageRole(chatMessage: ChatMessage): string {
    return chatMessage.role === "user" ? "You" : "Assistant";
}

function formatMessageTimestamp(chatMessage: ChatMessage): string {
    if (!chatMessage.timestamp) return "";
    return new Date(chatMessage.timestamp).toLocaleTimeString();
}

function getVisibleMessages(messages: ChatMessage[]): ChatMessage[] {
    return messages.filter((chatMessage) => chatMessage.role !== "system" && chatMessage.role !== "developer");
}

function shouldRenderAsPlainText(
    chatMessage: ChatMessage,
    messageIndex: number,
    totalMessages: number,
    isStreaming: boolean
): boolean {
    if (!isStreaming) return false;
    const isLastVisibleMessage = messageIndex === totalMessages - 1;
    return chatMessage.role === "assistant" && isLastVisibleMessage;
}

export class MessageListViewUpdater {
    private readonly listElement: HTMLElement;
    private readonly renderedEntries: RenderedMessageEntry[] = [];
    private currentSourcePath = "";
    private markdownRenderer: ChatMessageRenderer | null = null;

    constructor(private readonly container: HTMLElement) {
        this.listElement = this.container.createDiv({ cls: "vault-wizard-message-list" });
    }

    sync(messages: ChatMessage[], messageListRenderOptions: MessageListRenderOptions): void {
        this.ensureRenderer(messageListRenderOptions);

        const shouldKeepBottomAnchored = this.shouldKeepBottomAnchored();
        const visibleMessages = getVisibleMessages(messages);

        if (this.requiresFullRerender(visibleMessages)) {
            this.fullRerender(visibleMessages, messageListRenderOptions.isStreaming, shouldKeepBottomAnchored);
            return;
        }

        const didUpdateMessageList = this.applyIncrementalUpdates(
            visibleMessages,
            messageListRenderOptions.isStreaming
        );

        if (didUpdateMessageList && shouldKeepBottomAnchored) {
            this.scrollToBottom();
        }
    }

    clear(): void {
        this.renderedEntries.splice(0, this.renderedEntries.length);
        this.listElement.empty();
    }

    private ensureRenderer(messageListRenderOptions: MessageListRenderOptions): void {
        if (
            this.markdownRenderer &&
            this.currentSourcePath === messageListRenderOptions.sourcePath
        ) {
            return;
        }

        this.currentSourcePath = messageListRenderOptions.sourcePath;
        this.markdownRenderer = new ChatMessageRenderer({
            app: messageListRenderOptions.app,
            component: messageListRenderOptions.component,
            sourcePath: messageListRenderOptions.sourcePath
        });
    }

    private requiresFullRerender(nextMessages: ChatMessage[]): boolean {
        if (nextMessages.length < this.renderedEntries.length) return true;

        for (let messageIndex = 0; messageIndex < this.renderedEntries.length; messageIndex += 1) {
            const existingEntry = this.renderedEntries[messageIndex];
            const nextMessage = nextMessages[messageIndex];
            if (!nextMessage) return true;

            const sameIdentity =
                existingEntry.role === nextMessage.role &&
                existingEntry.timestamp === nextMessage.timestamp;

            if (!sameIdentity) return true;
        }

        return false;
    }

    private fullRerender(
        nextMessages: ChatMessage[],
        isStreaming: boolean,
        shouldKeepBottomAnchored: boolean
    ): void {
        this.listElement.empty();
        this.renderedEntries.splice(0, this.renderedEntries.length);

        for (let messageIndex = 0; messageIndex < nextMessages.length; messageIndex += 1) {
            const nextMessage = nextMessages[messageIndex];
            this.appendMessage(nextMessage, messageIndex, nextMessages.length, isStreaming);
        }

        if (shouldKeepBottomAnchored) {
            this.scrollToBottom();
        }
    }

    private applyIncrementalUpdates(nextMessages: ChatMessage[], isStreaming: boolean): boolean {
        const previousLength = this.renderedEntries.length;
        let didUpdateMessageList = false;

        for (let messageIndex = 0; messageIndex < nextMessages.length; messageIndex += 1) {
            const nextMessage = nextMessages[messageIndex];

            if (messageIndex >= previousLength) {
                this.appendMessage(nextMessage, messageIndex, nextMessages.length, isStreaming);
                didUpdateMessageList = true;
                continue;
            }

            const existingEntry = this.renderedEntries[messageIndex];
            const nextShouldBePlainText = shouldRenderAsPlainText(
                nextMessage,
                messageIndex,
                nextMessages.length,
                isStreaming
            );

            const didContentChange = existingEntry.content !== nextMessage.content;
            const didRenderModeChange = existingEntry.renderedAsPlainText !== nextShouldBePlainText;

            if (!didContentChange && !didRenderModeChange) continue;

            this.renderMessageContent(existingEntry.contentElement, nextMessage.content, nextShouldBePlainText);

            existingEntry.content = nextMessage.content;
            existingEntry.renderedAsPlainText = nextShouldBePlainText;
            didUpdateMessageList = true;
        }

        return didUpdateMessageList;
    }

    private appendMessage(
        chatMessage: ChatMessage,
        messageIndex: number,
        totalMessages: number,
        isStreaming: boolean
    ): void {
        const messageRowElement = this.listElement.createDiv({
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

        const renderAsPlainText = shouldRenderAsPlainText(
            chatMessage,
            messageIndex,
            totalMessages,
            isStreaming
        );

        this.renderMessageContent(messageContentElement, chatMessage.content, renderAsPlainText);

        this.renderedEntries.push({
            role: chatMessage.role,
            timestamp: chatMessage.timestamp,
            content: chatMessage.content,
            contentElement: messageContentElement,
            renderedAsPlainText: renderAsPlainText
        });
    }

    private renderMessageContent(
        messageContentElement: HTMLElement,
        content: string,
        renderAsPlainText: boolean
    ): void {
        messageContentElement.empty();

        if (renderAsPlainText) {
            messageContentElement.setText(content);
            return;
        }

        this.markdownRenderer?.renderMarkdown(messageContentElement, content);
    }

    private shouldKeepBottomAnchored(): boolean {
        const hasVerticalOverflow = this.listElement.scrollHeight > this.listElement.clientHeight + 1;
        if (!hasVerticalOverflow) return true;
        return this.isNearBottom();
    }

    private isNearBottom(): boolean {
        const distanceFromBottom =
            this.listElement.scrollHeight - this.listElement.scrollTop - this.listElement.clientHeight;
        return distanceFromBottom <= AUTO_SCROLL_BOTTOM_THRESHOLD_PX;
    }

    private scrollToBottom(): void {
        this.listElement.scrollTop = this.listElement.scrollHeight;
    }
}