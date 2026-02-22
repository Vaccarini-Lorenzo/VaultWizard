import { AiProvider } from "../../models/AiProvider";

interface ProviderFieldDefinition {
    settingKey: string;
    label: string;
    placeholder: string;
}

const providerFieldDefinitions: Record<AiProvider, ProviderFieldDefinition[]> = {
    azure: [
        {
            settingKey: "endpoint",
            label: "Endpoint",
            placeholder: "https://your-resource.openai.azure.com"
        },
        {
            settingKey: "apiKey",
            label: "API Key",
            placeholder: "Azure API key"
        },
        {
            settingKey: "deploymentName",
            label: "Deployment Name",
            placeholder: "e.g. gpt-4o-mini"
        },
        {
            settingKey: "apiVersion",
            label: "API Version",
            placeholder: "e.g. 2024-10-21"
        }
    ],
    openai: [
        {
            settingKey: "apiKey",
            label: "API Key",
            placeholder: "OpenAI API key"
        },
        {
            settingKey: "model",
            label: "Model",
            placeholder: "e.g. gpt-4.1-mini"
        },
        {
            settingKey: "baseUrl",
            label: "Base URL (optional)",
            placeholder: "https://api.openai.com/v1"
        }
    ],
    anthropic: [
        {
            settingKey: "apiKey",
            label: "API Key",
            placeholder: "Anthropic API key"
        },
        {
            settingKey: "model",
            label: "Model",
            placeholder: "e.g. claude-3-5-sonnet-latest"
        }
    ]
};

function createProviderInput(
    container: HTMLElement,
    providerFieldDefinition: ProviderFieldDefinition
): void {
    const fieldWrapper = container.createDiv({ cls: "vault-wizard-form-field" });
    fieldWrapper.createEl("label", {
        cls: "vault-wizard-form-label",
        text: providerFieldDefinition.label
    });

    fieldWrapper.createEl("input", {
        cls: "vault-wizard-form-input",
        attr: {
            type: "text",
            placeholder: providerFieldDefinition.placeholder,
            "data-setting-key": providerFieldDefinition.settingKey
        }
    });
}

export function renderProviderFields(container: HTMLElement, provider: AiProvider): void {
    container.empty();

    const selectedProviderFieldDefinitions = providerFieldDefinitions[provider];
    for (const providerFieldDefinition of selectedProviderFieldDefinitions) {
        createProviderInput(container, providerFieldDefinition);
    }
}