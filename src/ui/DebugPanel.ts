import { currentChatStorage } from "services/CurrentChatStorage";
import { ChatController } from "../controllers/ChatController";

export function renderDebugPanel(container: HTMLElement, controller: ChatController) {
    const wrap = container.createDiv({ cls: "vault-wizard-debug-wrap" });

    const top = wrap.createDiv({ cls: "vault-wizard-header" });
    top.createEl("h3", { text: "Debug", cls: "vault-wizard-title" });

    const backBtn = top.createEl("button", { cls: "vault-wizard-icon-btn", text: "Back" });
    backBtn.addEventListener("click", () => controller.openChatPanel());

    const pre = wrap.createEl("pre", { cls: "vault-wizard-debug-pre" });
    const state = {
        messageCount: currentChatStorage.getMessages().length,
        streaming: controller.isStreaming(),
        activeNotePath: controller.getActiveNotePath(),
        configuredModels: controller.getConfiguredModels().length
    };
    pre.textContent = JSON.stringify(state, null, 2);
}