import { currentChatStorage } from "services/CurrentChatStorage";
import { ChatController } from "../controllers/ChatController";

const REQUEST_PREVIEW_MAX_LENGTH = 180;
const RESPONSE_PREVIEW_MAX_LENGTH = 280;

export function renderDebugPanel(container: HTMLElement, controller: ChatController) {
    const wrap = container.createDiv({ cls: "vault-wizard-debug-wrap" });

    const top = wrap.createDiv({ cls: "vault-wizard-header" });
    top.createEl("h3", { text: "Debug", cls: "vault-wizard-title" });

    const backButton = top.createEl("button", { cls: "vault-wizard-icon-btn", text: "Back" });
    backButton.addEventListener("click", () => controller.openChatPanel());

    const aggregateUsage = controller.getAggregateTokenUsage();
    const aggregateSection = wrap.createDiv({ cls: "vault-wizard-debug-summary-card" });
    aggregateSection.createEl("h4", { text: "Aggregate token usage", cls: "vault-wizard-debug-section-title" });

    const aggregateUsageGrid = aggregateSection.createDiv({ cls: "vault-wizard-debug-usage-grid" });
    createUsageItem(aggregateUsageGrid, "Input", String(aggregateUsage.inputTokens));
    createUsageItem(aggregateUsageGrid, "Output", String(aggregateUsage.outputTokens));
    createUsageItem(aggregateUsageGrid, "Cached", String(aggregateUsage.cachedInputTokens));

    const traces = controller.getDebugTurns();
    const tracesSection = wrap.createDiv({ cls: "vault-wizard-debug-traces-section" });
    tracesSection.createEl("h4", { text: `Requests (${traces.length})`, cls: "vault-wizard-debug-section-title" });

    if (traces.length === 0) {
        tracesSection.createDiv({
            cls: "vault-wizard-debug-empty-state",
            text: "No debug traces yet."
        });
        return;
    }

    const tracesList = tracesSection.createDiv({ cls: "vault-wizard-debug-traces-list" });
    const tracesInReverseChronologicalOrder = [...traces].reverse();

    for (const trace of tracesInReverseChronologicalOrder) {
        const traceCard = tracesList.createDiv({ cls: "vault-wizard-debug-trace-card" });

        const requestPreview = buildRequestPreview(trace.userPrompt, trace.context);
        const responsePreview = truncateText(trace.assistantResponse, RESPONSE_PREVIEW_MAX_LENGTH);

        const requestBlock = traceCard.createDiv({ cls: "vault-wizard-debug-block" });
        requestBlock.createEl("div", { text: "Request", cls: "vault-wizard-debug-block-title" });
        requestBlock.createEl("pre", { text: requestPreview, cls: "vault-wizard-debug-code-block" });

        const responseBlock = traceCard.createDiv({ cls: "vault-wizard-debug-block" });
        responseBlock.createEl("div", { text: "Response", cls: "vault-wizard-debug-block-title" });
        responseBlock.createEl("pre", { text: responsePreview, cls: "vault-wizard-debug-code-block" });

        const usageGrid = traceCard.createDiv({ cls: "vault-wizard-debug-usage-grid" });
        createUsageItem(usageGrid, "Input", trace.tokenUsage ? String(trace.tokenUsage.inputTokens) : "n/a");
        createUsageItem(usageGrid, "Output", trace.tokenUsage ? String(trace.tokenUsage.outputTokens) : "n/a");
        createUsageItem(usageGrid, "Cached", trace.tokenUsage ? String(trace.tokenUsage.cachedInputTokens) : "n/a");

        traceCard.createEl("small", {
            cls: "vault-wizard-debug-timestamp",
            text: new Date(trace.timestamp).toLocaleTimeString()
        });
    }
}

function buildRequestPreview(userPrompt: string, context: string): string {
    const normalizedContext = context?.trim() ? context.trim() : "(no context sent)";
    const fullRequest = `prompt="${userPrompt}"\ncontext="${normalizedContext}"`;
    return truncateText(fullRequest, REQUEST_PREVIEW_MAX_LENGTH);
}

function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}…`;
}

function createUsageItem(container: HTMLElement, label: string, value: string): void {
    const usageItem = container.createDiv({ cls: "vault-wizard-debug-usage-item" });
    usageItem.createEl("span", { text: label, cls: "vault-wizard-debug-usage-label" });
    usageItem.createEl("strong", { text: value, cls: "vault-wizard-debug-usage-value" });
}