import { DEFAULT_CHAT_REFERENCE_LABEL } from "../../constants";

function escapeMarkdownLinkLabel(markdownLabel: string): string {
    return markdownLabel.replace(/\]/g, "\\]");
}

export function createConversationEmbedLink(chatId: string): string {
    const encodedchatId = encodeURIComponent(chatId.trim());
    return `obsidian://vault-wizard-chat?chatId=${encodedchatId}`;
}

export function createConversationEmbedMarkdown(
    chatId: string,
    conversationReferenceLabel: string = DEFAULT_CHAT_REFERENCE_LABEL
): string {
    console.log("Creating conversation embed markdown with chatId:", chatId, "and label:", conversationReferenceLabel); // Debug log
    const sanitizedchatId = chatId.trim();
    const sanitizedConversationReferenceLabel = conversationReferenceLabel.trim();

    if (!sanitizedchatId) return "";

    const labelToRender = sanitizedConversationReferenceLabel || DEFAULT_CHAT_REFERENCE_LABEL;
    const escapedMarkdownLabel = escapeMarkdownLinkLabel(labelToRender);
    const conversationEmbedLink = createConversationEmbedLink(sanitizedchatId);

    return `[${escapedMarkdownLabel}](${conversationEmbedLink})`;
}