import { setIcon } from "obsidian";
import { ConfiguredModel } from "../../models/llm/ConfiguredModel";

export function renderChatHeader(
    container: HTMLElement,
    onOpenDebugPanel: () => void,
    onOpenSettingsPanel: () => void,
    configuredModels: readonly ConfiguredModel[],
    selectedConfiguredModelId: string | null,
    onSelectConfiguredModel: (configuredModelId: string) => void,
    onEmbedConversationInEditor: () => void,
    onNewChat: () => void,
    onToggleHistorySidebar: () => void
) {
    const header = container.createDiv({ cls: "vault-wizard-header" });

    const controlsWrapper = header.createDiv({ cls: "vault-wizard-header-actions" });

    const modelSelect = controlsWrapper.createEl("select", {
        cls: "vault-wizard-form-select vault-wizard-header-model-select"
    });

    if (configuredModels.length === 0) {
        const emptyOption = modelSelect.createEl("option", {
            value: "",
            text: "No models"
        });
        emptyOption.selected = true;
        modelSelect.disabled = true;
    } else {
        for (const configuredModel of configuredModels) {
            const optionLabel = `${configuredModel.provider} • ${configuredModel.modelName}`;
            const option = modelSelect.createEl("option", {
                value: configuredModel.id,
                text: optionLabel
            });

            if (selectedConfiguredModelId && configuredModel.id === selectedConfiguredModelId) {
                option.selected = true;
            }
        }

        modelSelect.addEventListener("change", () => {
            if (!modelSelect.value) return;
            onSelectConfiguredModel(modelSelect.value);
        });
    }

    const historyButton = controlsWrapper.createEl("button", {
        cls: "vault-wizard-icon-btn vault-wizard-history-btn"
    });
    historyButton.setAttribute("aria-label", "Toggle older chats sidebar");
    setIcon(historyButton, "history");
    historyButton.createSpan({ cls: "vault-wizard-btn-label", text: " Chats" });
    historyButton.addEventListener("click", onToggleHistorySidebar);

    const embedConversationButton = controlsWrapper.createEl("button", {
        cls: "vault-wizard-icon-btn vault-wizard-embed-btn"
    });
    embedConversationButton.setAttribute("aria-label", "Embed conversation reference in editor");
    setIcon(embedConversationButton, "link");
    embedConversationButton.createSpan({ cls: "vault-wizard-btn-label", text: " Embed" });
    embedConversationButton.addEventListener("click", onEmbedConversationInEditor);

    const newChatButton = controlsWrapper.createEl("button", {
        cls: "vault-wizard-icon-btn vault-wizard-new-chat-btn"
    });
    newChatButton.setAttribute("aria-label", "Start new chat");
    setIcon(newChatButton, "plus");
    newChatButton.addEventListener("click", onNewChat);

    const debugButton = controlsWrapper.createEl("button", { cls: "vault-wizard-icon-btn" });
    debugButton.setAttribute("aria-label", "Open debug panel");
    setIcon(debugButton, "bug");
    debugButton.addEventListener("click", onOpenDebugPanel);

    const settingsButton = controlsWrapper.createEl("button", { cls: "vault-wizard-icon-btn" });
    settingsButton.setAttribute("aria-label", "Open settings panel");
    setIcon(settingsButton, "settings");
    settingsButton.addEventListener("click", onOpenSettingsPanel);
}