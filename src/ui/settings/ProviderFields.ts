import { AiProvider } from "../../models/llm/AiProvider";

interface ProviderFieldDefinition {
    settingKey: string;
    label: string;
    placeholder: string;
    inputType?: "text" | "password";
}

const providerFieldDefinitions: Record<AiProvider, ProviderFieldDefinition[]> = {
    azure: [
        {
            settingKey: "endpoint",
            label: "Endpoint (including chat/response path)",
            placeholder: "https://your-resource.openai.azure.com/openai/responses"
        },
        {
            settingKey: "apiKey",
            label: "API Key (optional if using Client ID/Secret)",
            placeholder: "Azure API key",
            inputType: "password"
        },
        {
            settingKey: "tenantId",
            label: "Tenant ID (for Client Credentials auth)",
            placeholder: "Azure AD tenant ID"
        },
        {
            settingKey: "clientId",
            label: "Client ID (for Client Credentials auth)",
            placeholder: "Azure AD app client ID"
        },
        {
            settingKey: "clientSecret",
            label: "Client Secret (for Client Credentials auth)",
            placeholder: "Azure AD app client secret",
            inputType: "password"
        },
        {
            settingKey: "authorityHost",
            label: "Authority Host (optional)",
            placeholder: "https://login.microsoftonline.com"
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
            placeholder: "OpenAI API key",
            inputType: "password"
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
            placeholder: "Anthropic API key",
            inputType: "password"
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
            type: providerFieldDefinition.inputType ?? "text",
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