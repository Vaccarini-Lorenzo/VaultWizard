import { Notice, setIcon } from "obsidian";
import { renderPersistenceSettingsForm } from "./PersistenceSettingsForm";
import { ChatController } from "controllers/ChatController";
import { renderUserBackgroundSection } from "./UserBackgroundSection";

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

            const modelIdentity = modelRow.createDiv({ cls: "vault-wizard-settings-model-identity" });
            modelIdentity.createSpan({
                cls: "vault-wizard-settings-provider-badge",
                text: configuredModel.provider
            });
            modelIdentity.createSpan({
                cls: "vault-wizard-settings-model-name",
                text: configuredModel.modelName
            });

            const rowActions = modelRow.createDiv({ cls: "vault-wizard-settings-row-actions" });

            const editButton = rowActions.createEl("button", {
                cls: "vault-wizard-icon-btn vault-wizard-ghost-btn vault-wizard-settings-edit-btn vault-wizard-settings-action-icon-btn",
                attr: { "aria-label": "Edit model", title: "Edit" }
            });
            setIcon(editButton, "pencil");
            editButton.addEventListener("click", () => controller.openEditModelPanel(configuredModel.id));

            const removeButton = rowActions.createEl("button", {
                cls: "vault-wizard-icon-btn vault-wizard-ghost-btn vault-wizard-settings-delete-btn vault-wizard-settings-action-icon-btn",
                attr: { "aria-label": "Remove model", title: "Remove" }
            });
            setIcon(removeButton, "trash-2");
            removeButton.addEventListener("click", async () => {
                const confirmed = window.confirm(
                    `Delete model "${configuredModel.modelName}"? This action cannot be undone.`
                );
                if (!confirmed) return;

                await controller.deleteConfiguredModel(configuredModel.id);
                new Notice("Model deleted.");
            });
        }
    }

    const actionsWrapper = modelsCard.createDiv({ cls: "vault-wizard-settings-actions" });
    const addModelButton = actionsWrapper.createEl("button", {
        cls: "vault-wizard-send-btn vault-wizard-settings-primary-action",
        text: "Add a model"
    });
    addModelButton.addEventListener("click", () => controller.openAddModelPanel());

    renderPersistenceSettingsForm(settingsWrapper, controller);
    renderUserBackgroundSection(settingsWrapper, controller);
}