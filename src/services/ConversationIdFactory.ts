export class ConversationIdFactory {
    createConversationId(): string {
        const now = Date.now().toString(36);
        const randomSuffix = Math.random().toString(36).slice(2, 10);
        return `conv_${now}_${randomSuffix}`;
    }
}