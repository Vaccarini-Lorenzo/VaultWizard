export const VAULT_WIZARD_CHAT_PROTOCOL_ACTION = "vault-wizard-chat";

type ObsidianProtocolParams = Record<string, string>;

const SUPPORTED_CONVERSATION_ID_KEYS = ["conversationId", "conversationid", "id"] as const;

export function resolveConversationIdFromProtocolParams(
    protocolParams: ObsidianProtocolParams
): string | null {
    for (const supportedKey of SUPPORTED_CONVERSATION_ID_KEYS) {
        const rawConversationId = protocolParams[supportedKey];
        if (!rawConversationId) continue;

        const sanitizedConversationId = rawConversationId.trim();
        if (sanitizedConversationId.length > 0) {
            return sanitizedConversationId;
        }
    }

    return null;
}