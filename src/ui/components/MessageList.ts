import { ChatMessage } from "../../models/ChatMessage";

export function renderMessageList(container: HTMLElement, messages: ChatMessage[]) {
    const list = container.createDiv({ cls: "ai-helper-message-list" });

    for (const msg of messages) {
        const row = list.createDiv({ cls: `ai-helper-message ai-helper-${msg.role}` });
        row.createDiv({
            cls: "ai-helper-message-content",
            text: msg.content
        });
    }

    // Keep latest visible
    list.scrollTop = list.scrollHeight;
}