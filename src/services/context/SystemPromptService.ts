import { DEFAULT_SYSTEM_PROMPT } from "../../constants";

class SystemPromptService {
    private systemPrompt: string;

    constructor() {
        this.systemPrompt = DEFAULT_SYSTEM_PROMPT;
    }

    resetSystemPrompt() {
        this.systemPrompt = DEFAULT_SYSTEM_PROMPT;
    }

    getSystemPrompt() {
        return this.systemPrompt;
    }
    
    appendNewInstructions(newPrompt: string) {
        this.systemPrompt += "\n" + newPrompt;
    }
}

export const systemPromptService = new SystemPromptService();