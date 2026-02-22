import { SelectedModelState } from "../state/SelectedModelState";
import { AIInvokerFactory } from "../llm/AIInvokerFactory";

export class LLMController {
    constructor(
        private readonly selectedModelState: SelectedModelState,
        private readonly aiInvokerFactory: AIInvokerFactory
    ) {}

    async streamAssistantReply(
        userMessage: string,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        const selectedModel = this.selectedModelState.getSelectedModel();
        if (!selectedModel) {
            onChunk("No model selected. Please configure and select a model.");
            return;
        }

        const aiInvoker = this.aiInvokerFactory.getInvoker(selectedModel.provider);
        await aiInvoker.streamResponse({ userMessage, configuredModel: selectedModel }, onChunk);
    }
}