import { ChatMessage } from "../../models/ChatMessage";

export function renderMessageList(container: HTMLElement, messages: ChatMessage[]) {
    const list = container.createDiv({ cls: "vault-wizard-message-list" });

    for (const msg of messages) {
        if (msg.role === "system" || msg.role === "tool") {
            continue;
        }
        const row = list.createDiv({ cls: `vault-wizard-message vault-wizard-${msg.role}` });
        row.createDiv({
            cls: "vault-wizard-message-content",
            text: msg.content
        });
    }

    // Keep latest visible
    list.scrollTop = list.scrollHeight;
}