export class ChatService {
    async streamEcho(
        userMessage: string,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        const full = `echo: ${userMessage}`;
        for (let i = 0; i < full.length; i += 3) {
            onChunk(full.slice(i, i + 3));
            await this.sleep(35);
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
    }
}