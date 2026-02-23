import { SelectedModelState } from "../state/SelectedModelState";
import { AIInvokerFactory } from "../llm/AIInvokerFactory";
import { AIInvokerResult } from "../llm/invokers/AIInvoker";

export class LLMController {
    constructor(
        private readonly selectedModelState: SelectedModelState,
        private readonly aiInvokerFactory: AIInvokerFactory
    ) {}

    async streamAssistantReply(
        newUserMessage: string,
        onChunk: (chunk: string) => void
    ): Promise<AIInvokerResult> {
        const selectedModel = this.selectedModelState.getSelectedModel();
        if (!selectedModel) {
            onChunk("No model selected. Please configure and select a model.");
            return {};
        }

        const aiInvoker = this.aiInvokerFactory.getInvoker(selectedModel.provider);
        return await aiInvoker.streamResponse({ newUserMessage, configuredModel: selectedModel }, onChunk);
    }
}