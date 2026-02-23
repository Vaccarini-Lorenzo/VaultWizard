import { SelectedContextSnapshot } from "services/SelectedContextStorage";

export function renderSelectedContextBadge(
    container: HTMLElement,
    selectedContextSnapshot: SelectedContextSnapshot | null
): void {
    if (!selectedContextSnapshot) return;

    const selectedContextBadgeElement = container.createDiv({
        cls: "vault-wizard-selected-context-badge"
    });

    selectedContextBadgeElement.createSpan({
        cls: "vault-wizard-selected-context-file",
        text: selectedContextSnapshot.sourcePath
    });

    selectedContextBadgeElement.createSpan({
        cls: "vault-wizard-selected-context-lines",
        text: formatLineRange(selectedContextSnapshot.startLineNumber, selectedContextSnapshot.endLineNumber)
    });
}

function formatLineRange(startLineNumber: number, endLineNumber: number): string {
    if (startLineNumber === endLineNumber) {
        return `Line ${startLineNumber}`;
    }

    return `Lines ${startLineNumber}–${endLineNumber}`;
}