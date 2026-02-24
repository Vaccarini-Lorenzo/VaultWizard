import { ChatController } from "../../controllers/ChatController";
import { ChatPersistenceProvider, ChatPersistenceSettings } from "../../models/chat/ChatPersistenceSettings";

function createFormField(
    container: HTMLElement,
    label: string,
    inputType: "text" | "password",
    value: string,
    placeholder: string,
    onInput: (nextValue: string) => void
): void {
    const fieldWrapper = container.createDiv({ cls: "vault-wizard-form-field" });
    fieldWrapper.createEl("label", { cls: "vault-wizard-form-label", text: label });

    const inputElement = fieldWrapper.createEl("input", {
        cls: "vault-wizard-form-input",
        attr: {
            type: inputType,
            value,
            placeholder
        }
    });

    inputElement.addEventListener("input", () => onInput(inputElement.value));
}

function renderLocalProviderFields(
    container: HTMLElement,
    controller: ChatController,
    settings: Extract<ChatPersistenceSettings, { provider: "local" }>
): void {
    const advancedToggleWrapper = container.createDiv({ cls: "vault-wizard-form-field" });
    const checkboxLabel = advancedToggleWrapper.createEl("label", {
        cls: "vault-wizard-form-label"
    });

    const advancedCheckbox = checkboxLabel.createEl("input", {
        attr: { type: "checkbox" }
    });
    advancedCheckbox.checked = settings.useCustomFolderPath;
    checkboxLabel.appendText(" Use custom folder path (Advanced)");

    advancedCheckbox.addEventListener("change", () => {
        controller.updateLocalChatPersistenceSettings({
            useCustomFolderPath: advancedCheckbox.checked
        });
    });

    if (settings.useCustomFolderPath) {
        createFormField(
            container,
            "Folder Path",
            "text",
            settings.folderPath,
            ".obsidian/plugins/vault_wizard/chats",
            (nextFolderPath) => {
                controller.updateLocalChatPersistenceSettings({ folderPath: nextFolderPath });
            }
        );
    } else {
        container.createEl("p", {
            cls: "vault-wizard-settings-description",
            text: "Default folder will be used automatically."
        });
    }
}

function renderCosmosDbProviderFields(
    container: HTMLElement,
    controller: ChatController,
    settings: Extract<ChatPersistenceSettings, { provider: "cosmosDB" }>
): void {
    createFormField(
        container,
        "Endpoint",
        "text",
        settings.endpoint,
        "https://your-account.documents.azure.com:443/",
        (nextValue) => controller.updateCosmosDbChatPersistenceSettings({ endpoint: nextValue })
    );

    createFormField(
        container,
        "Key",
        "password",
        settings.key,
        "Cosmos DB key",
        (nextValue) => controller.updateCosmosDbChatPersistenceSettings({ key: nextValue })
    );

    createFormField(
        container,
        "Database ID",
        "text",
        settings.databaseId,
        "vaultwizard-db",
        (nextValue) => controller.updateCosmosDbChatPersistenceSettings({ databaseId: nextValue })
    );

    createFormField(
        container,
        "Container ID",
        "text",
        settings.containerId,
        "chat-history",
        (nextValue) => controller.updateCosmosDbChatPersistenceSettings({ containerId: nextValue })
    );
}

export function renderPersistenceSettingsForm(container: HTMLElement, controller: ChatController): void {
    const persistenceCard = container.createDiv({
        cls: "vault-wizard-settings-card vault-wizard-form-card"
    });

    persistenceCard.createEl("h4", {
        cls: "vault-wizard-settings-subtitle",
        text: "Chat persistence"
    });

    persistenceCard.createEl("p", {
        cls: "vault-wizard-settings-description",
        text: "Select how chat history should be stored."
    });

    const currentSettings = controller.getChatPersistenceSettings();

    const providerField = persistenceCard.createDiv({ cls: "vault-wizard-form-field" });
    providerField.createEl("label", {
        cls: "vault-wizard-form-label",
        text: "Provider"
    });

    const providerSelect = providerField.createEl("select", {
        cls: "vault-wizard-provider-select"
    });

    const providerOptions: { value: ChatPersistenceProvider; label: string }[] = [
        { value: "local", label: "local" },
        { value: "cosmosDB", label: "cosmosDB" }
    ];

    for (const providerOption of providerOptions) {
        const optionElement = providerSelect.createEl("option", {
            value: providerOption.value,
            text: providerOption.label
        });
        optionElement.selected = providerOption.value === currentSettings.provider;
    }

    providerSelect.addEventListener("change", () => {
        const nextProvider = providerSelect.value as ChatPersistenceProvider;
        controller.setChatPersistenceProvider(nextProvider);
    });

    const providerFieldsContainer = persistenceCard.createDiv({
        cls: "vault-wizard-form-provider-fields vault-wizard-provider-fields-card"
    });

    if (currentSettings.provider === "local") {
        renderLocalProviderFields(providerFieldsContainer, controller, currentSettings);
        return;
    }

    renderCosmosDbProviderFields(providerFieldsContainer, controller, currentSettings);
}