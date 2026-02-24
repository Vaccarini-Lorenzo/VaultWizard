import { AiProvider } from "../models/llm/AiProvider";
import { AIInvoker } from "./invokers/AIInvoker";

export class AIInvokerFactory {
    constructor(private readonly azureAIInvoker: AIInvoker) {}

    getInvoker(provider: AiProvider): AIInvoker {
        if (provider === "azure") {
            return this.azureAIInvoker;
        }

        throw new Error(`No AI invoker implemented yet for provider: ${provider}`);
    }
}