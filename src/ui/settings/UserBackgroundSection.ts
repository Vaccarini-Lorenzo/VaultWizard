import { Notice } from "obsidian";
import { ChatController } from "../../controllers/ChatController";

export function renderUserBackgroundSection(container: HTMLElement, controller: ChatController): void {
    const userBackgroundCard = container.createDiv({
        cls: "vault-wizard-settings-card vault-wizard-form-card"
    });

    userBackgroundCard.createEl("h4", {
        cls: "vault-wizard-settings-subtitle",
        text: "User background & informations"
    });

    userBackgroundCard.createEl("p", {
        cls: "vault-wizard-settings-description",
        text: "Provide personal background details that can help the assistant respond better."
    });

    const textArea = userBackgroundCard.createEl("textarea", {
        cls: "vault-wizard-form-input vault-wizard-user-background-textarea",
        attr: {
            rows: "12",
            placeholder: "Example: role, goals, preferences, writing style, constraints, tools, etc."
        }
    });

    textArea.value = controller.getUserBackgroundInformations();

    const actionsWrapper = userBackgroundCard.createDiv({ cls: "vault-wizard-settings-actions" });
    const saveButton = actionsWrapper.createEl("button", {
        cls: "vault-wizard-send-btn vault-wizard-settings-primary-action",
        text: "Save user background"
    });

    saveButton.addEventListener("click", async () => {
        await controller.saveUserBackgroundInformations(textArea.value);
        new Notice("User background saved.");
    });
}