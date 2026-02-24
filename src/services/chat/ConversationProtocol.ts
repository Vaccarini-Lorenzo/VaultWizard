
type ObsidianProtocolParams = Record<string, string>;

const SUPPORTED_CONVERSATION_ID_KEYS = ["chatId", "chatId", "id"] as const;

export function resolvechatIdFromProtocolParams(
    protocolParams: ObsidianProtocolParams
): string | null {
    for (const supportedKey of SUPPORTED_CONVERSATION_ID_KEYS) {
        const rawchatId = protocolParams[supportedKey];
        if (!rawchatId) continue;

        const sanitizedchatId = rawchatId.trim();
        if (sanitizedchatId.length > 0) {
            return sanitizedchatId;
        }
    }

    return null;
}