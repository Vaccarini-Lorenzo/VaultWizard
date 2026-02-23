import { AzureResponsesTextExtractor } from "./AzureResponsesTextExtractor";

export class AzureResponsesSseReader {
    constructor(private readonly textExtractor: AzureResponsesTextExtractor) {}

    async consume(
        response: Response,
        onChunk: (chunk: string) => void,
        onEvent?: (eventPayload: unknown) => void
    ): Promise<void> {
        const responseBody = response.body;
        if (!responseBody) return;

        const streamReader = responseBody.getReader();
        const textDecoder = new TextDecoder("utf-8");
        let streamBuffer = "";

        while (true) {
            const { value, done } = await streamReader.read();
            if (done) break;

            streamBuffer += textDecoder.decode(value, { stream: true });
            const eventBlocks = streamBuffer.split("\n\n");
            streamBuffer = eventBlocks.pop() ?? "";

            for (const eventBlock of eventBlocks) {
                this.processEventBlock(eventBlock, onChunk, onEvent);
            }
        }

        const trimmedRemainingBuffer = streamBuffer.trim();
        if (trimmedRemainingBuffer) {
            this.processEventBlock(trimmedRemainingBuffer, onChunk, onEvent);
        }
    }

    private processEventBlock(
        eventBlock: string,
        onChunk: (chunk: string) => void,
        onEvent?: (eventPayload: unknown) => void
    ): void {
        const lines = eventBlock.split("\n");

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data:")) continue;

            const payload = trimmedLine.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
                const eventJson = JSON.parse(payload);
                onEvent?.(eventJson);

                const delta = this.textExtractor.extractDelta(eventJson);
                if (delta) {
                    onChunk(delta);
                }
            } catch {
                // Ignore malformed SSE event payloads.
            }
        }
    }
}