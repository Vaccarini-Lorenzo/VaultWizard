import { ChatController } from "../controllers/ChatController";
import { renderPersistenceSettingsForm } from "./components/PersistenceSettingsForm";

export function renderSettingsPanel(container: HTMLElement, controller: ChatController) {
    const settingsWrapper = container.createDiv({ cls: "vault-wizard-settings-wrap" });

    const headerWrapper = settingsWrapper.createDiv({ cls: "vault-wizard-header" });
    headerWrapper.createEl("h3", { text: "Settings", cls: "vault-wizard-title" });

    const backButton = headerWrapper.createEl("button", {
        cls: "vault-wizard-icon-btn vault-wizard-ghost-btn",
        text: "Back"
    });
    backButton.addEventListener("click", () => controller.openChatPanel());

    settingsWrapper.createEl("p", {
        cls: "vault-wizard-settings-description",
        text: "Manage model connections used by the assistant."
    });

    const modelsCard = settingsWrapper.createDiv({
        cls: "vault-wizard-settings-card vault-wizard-form-card"
    });

    modelsCard.createEl("h4", {
        cls: "vault-wizard-settings-subtitle",
        text: "Available models"
    });

    const modelListContainer = modelsCard.createDiv({ cls: "vault-wizard-settings-list" });
    const configuredModels = controller.getConfiguredModels();

    if (configuredModels.length === 0) {
        modelListContainer.createDiv({
            cls: "vault-wizard-settings-empty",
            text: "No models configured yet."
        });
    } else {
        for (const configuredModel of configuredModels) {
            const modelRow = modelListContainer.createDiv({ cls: "vault-wizard-settings-row" });
            modelRow.createSpan({
                cls: "vault-wizard-settings-provider-badge",
                text: configuredModel.provider
            });
            modelRow.createSpan({
                cls: "vault-wizard-settings-model-name",
                text: configuredModel.modelName
            });
        }
    }

    renderPersistenceSettingsForm(settingsWrapper, controller);

    const actionsWrapper = settingsWrapper.createDiv({ cls: "vault-wizard-settings-actions" });
    const addModelButton = actionsWrapper.createEl("button", {
        cls: "vault-wizard-send-btn vault-wizard-settings-primary-action",
        text: "Add a model"
    });
    addModelButton.addEventListener("click", () => controller.openAddModelPanel());
}