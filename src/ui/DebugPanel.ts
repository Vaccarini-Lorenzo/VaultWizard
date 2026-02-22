import { ChatController } from "../controllers/ChatController";

export function renderDebugPanel(container: HTMLElement, controller: ChatController) {
    const wrap = container.createDiv({ cls: "ai-helper-debug-wrap" });

    const top = wrap.createDiv({ cls: "ai-helper-header" });
    top.createEl("h3", { text: "Debug", cls: "ai-helper-title" });

    const backBtn = top.createEl("button", { cls: "ai-helper-icon-btn", text: "Back" });
    backBtn.addEventListener("click", () => controller.toggleDebug());

    const pre = wrap.createEl("pre", { cls: "ai-helper-debug-pre" });
    const state = {
        messageCount: controller.getMessages().length,
        streaming: controller.isStreaming(),
        activeNotePath: controller.getActiveNotePath()
    };
    pre.textContent = JSON.stringify(state, null, 2);
}