const DEFAULT_CONVERSATION_REFERENCE_LABEL = "conversation_object";

function escapeMarkdownLinkLabel(markdownLabel: string): string {
    return markdownLabel.replace(/\]/g, "\\]");
}

export function createConversationEmbedLink(conversationId: string): string {
    const encodedConversationId = encodeURIComponent(conversationId.trim());
    return `obsidian://vault-wizard-chat?conversationId=${encodedConversationId}`;
}

export function createConversationEmbedMarkdown(
    conversationId: string,
    conversationReferenceLabel: string = DEFAULT_CONVERSATION_REFERENCE_LABEL
): string {
    const sanitizedConversationId = conversationId.trim();
    const sanitizedConversationReferenceLabel = conversationReferenceLabel.trim();

    if (!sanitizedConversationId) return "";

    const labelToRender = sanitizedConversationReferenceLabel || DEFAULT_CONVERSATION_REFERENCE_LABEL;
    const escapedMarkdownLabel = escapeMarkdownLinkLabel(labelToRender);
    const conversationEmbedLink = createConversationEmbedLink(sanitizedConversationId);

    return `[${escapedMarkdownLabel}](${conversationEmbedLink})`;
}