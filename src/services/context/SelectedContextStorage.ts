export interface SelectedContextSnapshot {
    text: string;
    sourcePath: string;
    startLineNumber: number;
    endLineNumber: number;
    updatedAt: number;
}

type SelectedContextListener = () => void;

class SelectedContextStorage {
    private selectedContextSnapshot: SelectedContextSnapshot | null = null;
    private readonly listeners = new Set<SelectedContextListener>();

    setSelection(
        selectedText: string,
        sourcePath: string,
        startLineNumber: number,
        endLineNumber: number
    ): void {
        const normalizedSelectedText = selectedText.trim();
        if (!normalizedSelectedText) return;

        const normalizedStartLineNumber = Math.max(1, Math.min(startLineNumber, endLineNumber));
        const normalizedEndLineNumber = Math.max(normalizedStartLineNumber, Math.max(startLineNumber, endLineNumber));

        this.selectedContextSnapshot = {
            text: normalizedSelectedText,
            sourcePath,
            startLineNumber: normalizedStartLineNumber,
            endLineNumber: normalizedEndLineNumber,
            updatedAt: Date.now()
        };

        this.notifyListeners();
    }

    getSelection(): SelectedContextSnapshot | null {
        return this.selectedContextSnapshot;
    }

    clear(): void {
        if (!this.selectedContextSnapshot) return;
        this.selectedContextSnapshot = null;
        this.notifyListeners();
    }

    subscribe(listener: SelectedContextListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}

export const selectedContextStorage = new SelectedContextStorage();