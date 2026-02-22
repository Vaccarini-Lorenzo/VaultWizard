import { AIInvoker, AIInvokerInput } from "./AIInvoker";

export class AzureAIInvoker implements AIInvoker {
    async streamResponse(
        aiInvokerInput: AIInvokerInput,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        const deploymentName = aiInvokerInput.configuredModel.settings.deploymentName ?? "unknown-deployment";
        const draftResponse = `[Azure draft • ${deploymentName}] ${aiInvokerInput.userMessage}`;

        for (let index = 0; index < draftResponse.length; index += 4) {
            onChunk(draftResponse.slice(index, index + 4));
            await this.sleep(30);
        }
    }

    private sleep(milliseconds: number): Promise<void> {
        return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    }
}