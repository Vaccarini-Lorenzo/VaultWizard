export class AzureResponsesTextExtractor {
    extractDelta(eventPayload: unknown): string {
        const eventRecord = eventPayload as Record<string, any>;
        return (
            eventRecord?.delta ??
            eventRecord?.choices?.[0]?.delta?.content ??
            eventRecord?.output_text?.delta ??
            eventRecord?.response?.output_text?.delta ??
            ""
        );
    }

    extractText(responsePayload: unknown): string {
        const responseRecord = responsePayload as Record<string, any>;

        if (typeof responseRecord?.output_text === "string") {
            return responseRecord.output_text;
        }

        if (typeof responseRecord?.choices?.[0]?.message?.content === "string") {
            return responseRecord.choices[0].message.content;
        }

        const outputContent = responseRecord?.output?.[0]?.content;
        if (Array.isArray(outputContent)) {
            return outputContent
                .map((contentItem: any) => contentItem?.text ?? "")
                .filter(Boolean)
                .join("");
        }

        return "";
    }
}