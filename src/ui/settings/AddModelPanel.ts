import { ChatController } from "controllers/ChatController";
import { AiProvider } from "models/llm/AiProvider";
import { Notice } from "obsidian";
import { renderProviderFields } from "./ProviderFields";

type ProviderSettingInputElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function getProviderSettingElements(providerFieldsContainer: HTMLElement): NodeListOf<ProviderSettingInputElement> {
    return providerFieldsContainer.querySelectorAll<ProviderSettingInputElement>(
        "input[data-setting-key], textarea[data-setting-key], select[data-setting-key]"
    );
}

function collectProviderSettings(providerFieldsContainer: HTMLElement): Record<string, string> {
    const providerSettings: Record<string, string> = {};
    const providerInputElements: any = getProviderSettingElements(providerFieldsContainer);

    for (const providerInputElement of providerInputElements) {
        const settingKey = providerInputElement.dataset.settingKey;
        if (!settingKey) continue;
        providerSettings[settingKey] = providerInputElement.value.trim();
    }

    return providerSettings;
}

function applyProviderSettings(providerFieldsContainer: HTMLElement, providerSettings: Record<string, string>
): void {
    const providerInputElements: any = getProviderSettingElements(providerFieldsContainer);

    for (const providerInputElement of providerInputElements) {
        const settingKey = providerInputElement.dataset.settingKey;
        if (!settingKey) continue;
        providerInputElement.value = providerSettings[settingKey] ?? "";
    }
}

function validateAdditionalJsonBody(additionalJsonBodyValue: string): void {
    const trimmedAdditionalJsonBody = additionalJsonBodyValue.trim();
    if (!trimmedAdditionalJsonBody) return;

    let parsedAdditionalJsonBody: unknown;
    try {
        parsedAdditionalJsonBody = JSON.parse(trimmedAdditionalJsonBody);
    } catch {
        throw new Error(`"Additional JSON body" must be valid JSON.`);
    }

    const isObject =
        typeof parsedAdditionalJsonBody === "object" &&
        parsedAdditionalJsonBody !== null &&
        !Array.isArray(parsedAdditionalJsonBody);

    if (!isObject) {
        throw new Error(`"Additional JSON body" must be a JSON object.`);
    }
}

export function renderAddModelPanel(container: HTMLElement, controller: ChatController) {
    const editingConfiguredModel = controller.getEditingConfiguredModel();
    const isEditingConfiguredModel = editingConfiguredModel !== null;

    const settingsWrapper = container.createDiv({ cls: "vault-wizard-settings-wrap" });

    const headerWrapper = settingsWrapper.createDiv({ cls: "vault-wizard-header" });
    headerWrapper.createEl("h3", {
        text: isEditingConfiguredModel ? "Edit model" : "Add a model",
        cls: "vault-wizard-title"
    });

    const backButton = headerWrapper.createEl("button", {
        cls: "vault-wizard-icon-btn vault-wizard-ghost-btn",
        text: "Back"
    });
    backButton.addEventListener("click", () => controller.returnToSettingsPanel());

    settingsWrapper.createEl("p", {
        cls: "vault-wizard-add-model-description",
        text: isEditingConfiguredModel
            ? "Update your model connection details."
            : "Choose your AI provider to reveal the required connection fields."
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
    modelNameInput.value = editingConfiguredModel?.modelName ?? "";

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

    if (editingConfiguredModel) {
        providerSelect.value = editingConfiguredModel.provider;
        renderProviderFields(providerSpecificContainer, editingConfiguredModel.provider);
        applyProviderSettings(providerSpecificContainer, editingConfiguredModel.settings);
    }

    const additionalJsonBodyFieldWrapper = formCard.createDiv({ cls: "vault-wizard-form-field" });
    additionalJsonBodyFieldWrapper.createEl("label", {
        cls: "vault-wizard-form-label",
        text: "Additional JSON body (optional)"
    });

    const additionalJsonBodyTextarea = additionalJsonBodyFieldWrapper.createEl("textarea", {
        cls: "vault-wizard-form-input vault-wizard-form-textarea",
        attr: {
            rows: "6",
            "data-setting-key": "additional_json_body",
            placeholder: `{
  "temperature": 0.2,
  "top_p": 0.9
}`
        }
    });

    additionalJsonBodyTextarea.value = editingConfiguredModel?.settings?.additional_json_body ?? "";

    const actionsWrapper = formCard.createDiv({ cls: "vault-wizard-add-model-actions" });
    const saveButton = actionsWrapper.createEl("button", {
        cls: "vault-wizard-send-btn vault-wizard-add-model-save-btn",
        text: isEditingConfiguredModel ? "Update" : "Save"
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
        providerSettings.additional_json_body = additionalJsonBodyTextarea.value.trim();

        try {
            validateAdditionalJsonBody(providerSettings.additional_json_body);
        } catch (error) {
            const validationMessage =
                error instanceof Error ? error.message : "Invalid Additional JSON body.";
            new Notice(validationMessage);
            return;
        }

        if (editingConfiguredModel) {
            await controller.updateConfiguredModel(editingConfiguredModel.id, {
                provider: selectedProvider,
                modelName,
                settings: providerSettings
            });
            new Notice("Model updated.");
        } else {
            await controller.saveConfiguredModel({
                provider: selectedProvider,
                modelName,
                settings: providerSettings
            });
            new Notice("Model saved.");
        }

        controller.returnToSettingsPanel();
    });
}