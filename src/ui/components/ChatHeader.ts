import { setIcon } from "obsidian";

export function renderChatHeader(
    container: HTMLElement,
    onToggleDebug: () => void
) {
    const header = container.createDiv({ cls: "ai-helper-header" });
    header.createEl("h3", { text: "AI Helper", cls: "ai-helper-title" });

    const debugBtn = header.createEl("button", { cls: "ai-helper-icon-btn" });
    debugBtn.setAttribute("aria-label", "Toggle debug panel");
    setIcon(debugBtn, "bug");
    debugBtn.addEventListener("click", onToggleDebug);
}