import { setIcon } from "obsidian";

export function renderChatHeader(
    container: HTMLElement,
    onOpenDebugPanel: () => void,
    onOpenSettingsPanel: () => void
) {
    const header = container.createDiv({ cls: "vault-wizard-header" });
    header.createEl("h3", { text: "Vault Wizard", cls: "vault-wizard-title" });

    const actionsWrap = header.createDiv({ cls: "vault-wizard-header-actions" });

    const debugBtn = actionsWrap.createEl("button", { cls: "vault-wizard-icon-btn" });
    debugBtn.setAttribute("aria-label", "Open debug panel");
    setIcon(debugBtn, "bug");
    debugBtn.addEventListener("click", onOpenDebugPanel);

    const settingsBtn = actionsWrap.createEl("button", { cls: "vault-wizard-icon-btn" });
    settingsBtn.setAttribute("aria-label", "Open settings panel");
    setIcon(settingsBtn, "settings");
    settingsBtn.addEventListener("click", onOpenSettingsPanel);
}