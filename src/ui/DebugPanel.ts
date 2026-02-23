import { DebugTurnTrace } from "../models/DebugTurnTrace";
import { ChatController } from "../controllers/ChatController";

const REQUEST_PREVIEW_MAX_LENGTH = 180;
const RESPONSE_PREVIEW_MAX_LENGTH = 280;

export function renderDebugPanel(container: HTMLElement, controller: ChatController) {
    const wrapperElement = container.createDiv({ cls: "vault-wizard-debug-wrap" });

    const headerElement = wrapperElement.createDiv({ cls: "vault-wizard-header" });
    headerElement.createEl("h3", { text: "Debug", cls: "vault-wizard-title" });

    const backButtonElement = headerElement.createEl("button", { cls: "vault-wizard-icon-btn", text: "Back" });
    backButtonElement.addEventListener("click", () => controller.openChatPanel());

    renderAggregateTokenUsageSection(wrapperElement, controller);

    const debugTraces = controller.getDebugTurns();
    const tracesSectionElement = wrapperElement.createDiv({ cls: "vault-wizard-debug-traces-section" });
    tracesSectionElement.createEl("h4", {
        text: `Requests (${debugTraces.length})`,
        cls: "vault-wizard-debug-section-title"
    });

    if (debugTraces.length === 0) {
        tracesSectionElement.createDiv({
            cls: "vault-wizard-debug-empty-state",
            text: "No debug traces yet."
        });
        return;
    }

    const tracesListElement = tracesSectionElement.createDiv({ cls: "vault-wizard-debug-traces-list" });
    const tracesInReverseChronologicalOrder = [...debugTraces].reverse();

    for (const debugTrace of tracesInReverseChronologicalOrder) {
        renderTraceCard(tracesListElement, debugTrace);
    }
}

function renderAggregateTokenUsageSection(container: HTMLElement, controller: ChatController): void {
    const aggregateTokenUsage = controller.getAggregateTokenUsage();

    const aggregateSectionElement = container.createDiv({ cls: "vault-wizard-debug-summary-card" });
    aggregateSectionElement.createEl("h4", {
        text: "Aggregate token usage",
        cls: "vault-wizard-debug-section-title"
    });

    const aggregateUsageGridElement = aggregateSectionElement.createDiv({ cls: "vault-wizard-debug-usage-grid" });
    createUsageItem(aggregateUsageGridElement, "Input", String(aggregateTokenUsage.inputTokens));
    createUsageItem(aggregateUsageGridElement, "Output", String(aggregateTokenUsage.outputTokens));
    createUsageItem(aggregateUsageGridElement, "Cached", String(aggregateTokenUsage.cachedInputTokens));
}

function renderTraceCard(container: HTMLElement, debugTrace: DebugTurnTrace): void {
    const traceCardElement = container.createDiv({ cls: "vault-wizard-debug-trace-card" });

    const cardTopBarElement = traceCardElement.createDiv({ cls: "vault-wizard-debug-trace-card-topbar" });
    cardTopBarElement.createEl("strong", { text: "Request details" });

    const expandButtonElement = cardTopBarElement.createEl("button", {
        cls: "vault-wizard-icon-btn vault-wizard-debug-expand-btn",
        text: "⤢"
    });
    expandButtonElement.setAttribute("aria-label", "Open full request and response details");
    expandButtonElement.addEventListener("click", () => openExpandedTraceView(debugTrace));

    const requestPreview = buildRequestPreview(debugTrace);
    const responsePreview = truncateText(debugTrace.assistantResponse, RESPONSE_PREVIEW_MAX_LENGTH);

    const requestBlockElement = traceCardElement.createDiv({ cls: "vault-wizard-debug-block" });
    requestBlockElement.createEl("div", { text: "Request", cls: "vault-wizard-debug-block-title" });
    requestBlockElement.createEl("pre", { text: requestPreview, cls: "vault-wizard-debug-code-block" });

    const responseBlockElement = traceCardElement.createDiv({ cls: "vault-wizard-debug-block" });
    responseBlockElement.createEl("div", { text: "Response", cls: "vault-wizard-debug-block-title" });
    responseBlockElement.createEl("pre", { text: responsePreview, cls: "vault-wizard-debug-code-block" });

    const usageGridElement = traceCardElement.createDiv({ cls: "vault-wizard-debug-usage-grid" });
    createUsageItem(usageGridElement, "Input", debugTrace.tokenUsage ? String(debugTrace.tokenUsage.inputTokens) : "n/a");
    createUsageItem(usageGridElement, "Output", debugTrace.tokenUsage ? String(debugTrace.tokenUsage.outputTokens) : "n/a");
    createUsageItem(usageGridElement, "Cached", debugTrace.tokenUsage ? String(debugTrace.tokenUsage.cachedInputTokens) : "n/a");

    traceCardElement.createEl("small", {
        cls: "vault-wizard-debug-timestamp",
        text: new Date(debugTrace.timestamp).toLocaleTimeString()
    });
}

function openExpandedTraceView(debugTrace: DebugTurnTrace): void {
    const overlayElement = document.body.createDiv({ cls: "vault-wizard-debug-overlay" });
    const modalElement = overlayElement.createDiv({ cls: "vault-wizard-debug-modal" });

    const closeModal = () => {
        document.removeEventListener("keydown", onEscapeKeyDown);
        overlayElement.remove();
    };

    const onEscapeKeyDown = (keyboardEvent: KeyboardEvent) => {
        if (keyboardEvent.key === "Escape") {
            closeModal();
        }
    };
    document.addEventListener("keydown", onEscapeKeyDown);

    overlayElement.addEventListener("click", closeModal);
    modalElement.addEventListener("click", (mouseEvent) => mouseEvent.stopPropagation());

    const modalHeaderElement = modalElement.createDiv({ cls: "vault-wizard-debug-modal-header" });
    modalHeaderElement.createEl("h3", { text: "Request / Response details", cls: "vault-wizard-title" });

    const closeButtonElement = modalHeaderElement.createEl("button", {
        cls: "vault-wizard-icon-btn",
        text: "Close"
    });
    closeButtonElement.addEventListener("click", closeModal);

    const modalBodyElement = modalElement.createDiv({ cls: "vault-wizard-debug-modal-body" });

    const requestSectionElement = modalBodyElement.createDiv({ cls: "vault-wizard-debug-block" });
    requestSectionElement.createEl("div", { text: "Full request", cls: "vault-wizard-debug-block-title" });
    requestSectionElement.createEl("pre", {
        cls: "vault-wizard-debug-code-block vault-wizard-debug-code-block-large",
        text: buildFullRequest(debugTrace)
    });

    const responseSectionElement = modalBodyElement.createDiv({ cls: "vault-wizard-debug-block" });
    responseSectionElement.createEl("div", { text: "Full response", cls: "vault-wizard-debug-block-title" });
    responseSectionElement.createEl("pre", {
        cls: "vault-wizard-debug-code-block vault-wizard-debug-code-block-large",
        text: debugTrace.assistantResponse || "(empty response)"
    });

    const metadataSectionElement = modalBodyElement.createDiv({ cls: "vault-wizard-debug-block" });
    metadataSectionElement.createEl("div", { text: "Metadata", cls: "vault-wizard-debug-block-title" });
    metadataSectionElement.createEl("pre", {
        cls: "vault-wizard-debug-code-block",
        text: JSON.stringify(
            {
                tokenUsage: debugTrace.tokenUsage,
                responseMetadata: debugTrace.responseMetadata
            },
            null,
            2
        )
    });
}

function buildRequestPreview(debugTrace: DebugTurnTrace): string {
    const promptText = debugTrace.request?.prompt ?? debugTrace.userPrompt;
    const contextText = debugTrace.request?.context ?? debugTrace.context;
    const selectedContextText = debugTrace.request?.selectedContext ?? "none";
    const normalizedContextText = contextText?.trim() ? contextText.trim() : "none";
    const fullRequest = `prompt="${promptText}"\ncontext="${normalizedContextText}"\nselected="${selectedContextText}"`;
    return truncateText(fullRequest, REQUEST_PREVIEW_MAX_LENGTH);
}

function buildFullRequest(debugTrace: DebugTurnTrace): string {
    const promptText = debugTrace.request?.prompt ?? debugTrace.userPrompt;
    const contextText = debugTrace.request?.context ?? debugTrace.context;
    const selectedContextText = debugTrace.request?.selectedContext ?? "none";

    return [
        "prompt:",
        promptText || "(empty prompt)",
        "",
        "context:",
        contextText || "(no context)",
        "",
        "selected context:",
        selectedContextText
    ].join("\n");
}

function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}…`;
}

function createUsageItem(container: HTMLElement, label: string, value: string): void {
    const usageItemElement = container.createDiv({ cls: "vault-wizard-debug-usage-item" });
    usageItemElement.createEl("span", { text: label, cls: "vault-wizard-debug-usage-label" });
    usageItemElement.createEl("strong", { text: value, cls: "vault-wizard-debug-usage-value" });
}