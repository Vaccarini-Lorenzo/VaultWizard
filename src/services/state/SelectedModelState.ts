import { ConfiguredModel } from "../../models/llm/ConfiguredModel";

type SelectedModelListener = () => void;

export class SelectedModelState {
    private readonly listeners = new Set<SelectedModelListener>();
    private selectedConfiguredModel: ConfiguredModel | null = null;

    getSelectedModel(): ConfiguredModel | null {
        return this.selectedConfiguredModel;
    }

    setSelectedModel(nextSelectedModel: ConfiguredModel | null): void {
        this.selectedConfiguredModel = nextSelectedModel;
        this.notifyListeners();
    }

    subscribe(listener: SelectedModelListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener();
        }
    }
}

export const selectedModelState = new SelectedModelState();