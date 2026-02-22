import { AiProvider } from "../../models/AiProvider";

function createLabeledTextInput(
    container: HTMLElement,
    labelText: string,
    placeholderText: string
): void {
    const fieldWrap = container.createDiv({ cls: "vault-wizard-form-field" });
    fieldWrap.createEl("label", { cls: "vault-wizard-form-label", text: labelText });
    fieldWrap.createEl("input", {
        cls: "vault-wizard-form-input",
        attr: { type: "text", placeholder: placeholderText }
    });
}

export function renderProviderFields(container: HTMLElement, provider: AiProvider): void {
    container.empty();

    if (provider === "azure") {
        createLabeledTextInput(container, "Endpoint", "https://your-resource.openai.azure.com");
        createLabeledTextInput(container, "API Key", "Azure API key");
        createLabeledTextInput(container, "Deployment Name", "e.g. gpt-4o-mini");
        createLabeledTextInput(container, "API Version", "e.g. 2024-10-21");
        return;
    }

    if (provider === "openai") {
        createLabeledTextInput(container, "API Key", "OpenAI API key");
        createLabeledTextInput(container, "Model", "e.g. gpt-4.1-mini");
        createLabeledTextInput(container, "Base URL (optional)", "https://api.openai.com/v1");
        return;
    }

    createLabeledTextInput(container, "API Key", "Anthropic API key");
    createLabeledTextInput(container, "Model", "e.g. claude-3-5-sonnet-latest");
}