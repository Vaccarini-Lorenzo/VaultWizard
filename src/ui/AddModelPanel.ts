import { Notice } from "obsidian";
import { ChatController } from "../controllers/ChatController";
import { AiProvider } from "../models/AiProvider";
import { renderProviderFields } from "./components/ProviderFields";

function collectProviderSettings(providerFieldsContainer: HTMLElement): Record<string, string> {
    const providerSettings: Record<string, string> = {};
    const providerInputs: any = providerFieldsContainer.querySelectorAll<HTMLInputElement>("input[data-setting-key]");

    for (const providerInput of providerInputs) {
        const settingKey = providerInput.dataset.settingKey;
        if (!settingKey) continue;
        providerSettings[settingKey] = providerInput.value.trim();
    }

    return providerSettings;
}

export function renderAddModelPanel(container: HTMLElement, controller: ChatController) {
    const settingsWrapper = container.createDiv({ cls: "vault-wizard-settings-wrap" });

    const headerWrapper = settingsWrapper.createDiv({ cls: "vault-wizard-header" });
    headerWrapper.createEl("h3", { text: "Add a model", cls: "vault-wizard-title" });

    const backButton = headerWrapper.createEl("button", {
        cls: "vault-wizard-icon-btn vault-wizard-ghost-btn",
        text: "Back"
    });
    backButton.addEventListener("click", () => controller.returnToSettingsPanel());

    settingsWrapper.createEl("p", {
        cls: "vault-wizard-add-model-description",
        text: "Choose your AI provider to reveal the required connection fields."
    });

    const formCard = settingsWrapper.createDiv({ cls: "vault-wizard-form vault-wizard-form-card" });

    const modelNameFieldWrapper = formCard.createDiv({ cls: "vault-wizard-form-field" });
    modelNameFieldWrapper.createEl("label", {
        cls: "vault-wizard-form-label",
        text: "Model Name"
    });
    const modelNameInput = modelNameFieldWrapper.createEl("input", {
        cls: "vault-wizard-form-input",
        attr: {
            type: "text",
            placeholder: "e.g. Main OpenAI Model"
        }
    });

    const providerFieldWrapper = formCard.createDiv({ cls: "vault-wizard-form-field" });
    providerFieldWrapper.createEl("label", {
        cls: "vault-wizard-form-label",
        text: "AI Provider"
    });

    const providerSelect = providerFieldWrapper.createEl("select", {
        cls: "vault-wizard-form-select vault-wizard-provider-select"
    });
    providerSelect.createEl("option", { value: "", text: "Select provider..." });
    providerSelect.createEl("option", { value: "azure", text: "Azure" });
    providerSelect.createEl("option", { value: "openai", text: "OpenAI" });
    providerSelect.createEl("option", { value: "anthropic", text: "Anthropic" });

    const providerSpecificContainer = formCard.createDiv({
        cls: "vault-wizard-form-provider-fields vault-wizard-provider-fields-card"
    });

    providerSelect.addEventListener("change", () => {
        const selectedProvider = providerSelect.value as AiProvider | "";
        if (!selectedProvider) {
            providerSpecificContainer.empty();
            return;
        }

        renderProviderFields(providerSpecificContainer, selectedProvider);
    });

    const actionsWrapper = formCard.createDiv({ cls: "vault-wizard-add-model-actions" });
    const saveButton = actionsWrapper.createEl("button", {
        cls: "vault-wizard-send-btn vault-wizard-add-model-save-btn",
        text: "Save"
    });

    saveButton.addEventListener("click", async () => {
        const selectedProvider = providerSelect.value as AiProvider | "";
        const modelName = modelNameInput.value.trim();

        if (!modelName) {
            new Notice("Please enter a model name.");
            return;
        }

        if (!selectedProvider) {
            new Notice("Please select an AI provider.");
            return;
        }

        const providerSettings = collectProviderSettings(providerSpecificContainer);

        await controller.saveConfiguredModel({
            provider: selectedProvider,
            modelName,
            settings: providerSettings
        });

        new Notice("Model saved.");
        controller.returnToSettingsPanel();
    });
}