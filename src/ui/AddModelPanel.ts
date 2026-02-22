import { ChatController } from "../controllers/ChatController";
import { AiProvider } from "../models/AiProvider";
import { renderProviderFields } from "./components/ProviderFields";

export function renderAddModelPanel(container: HTMLElement, controller: ChatController) {
    const settingsWrapper = container.createDiv({ cls: "vault-wizard-settings-wrap" });

    const headerWrapper = settingsWrapper.createDiv({ cls: "vault-wizard-header" });
    headerWrapper.createEl("h3", { text: "Add a model", cls: "vault-wizard-title" });

    const backButton = headerWrapper.createEl("button", {
        cls: "vault-wizard-icon-btn vault-wizard-ghost-btn",
        text: "Back"
    });
    backButton.addEventListener("click", () => controller.returnToSettingsPanel());

    const descriptionText = settingsWrapper.createEl("p", {
        cls: "vault-wizard-add-model-description",
        text: "Choose your AI provider to reveal the required connection fields."
    });

    const formCard = settingsWrapper.createDiv({ cls: "vault-wizard-form vault-wizard-form-card" });

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

    if (!descriptionText.textContent) {
        descriptionText.textContent = "";
    }
}