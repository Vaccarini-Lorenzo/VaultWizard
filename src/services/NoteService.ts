import { App, MarkdownView } from "obsidian";
import { selectedContextStorage } from "services/SelectedContextStorage";

interface EditorSelectionSnapshot {
    selectedText: string;
    startLineNumber: number;
    endLineNumber: number;
}

export class NoteService {
    private contextRequired: boolean;

    constructor(private readonly app: App) {
        this.contextRequired = true;
    }

    async getActiveNoteContent(): Promise<string> {
        const file = this.app.workspace.getActiveFile();
        if (!file) return "";
        return this.app.vault.cachedRead(file);
    }

    notifyFileOpened(filePath: string) {
        this.contextRequired = true;

        const selectedContextSnapshot = selectedContextStorage.getSelection();
        if (selectedContextSnapshot && selectedContextSnapshot.sourcePath !== filePath) {
            selectedContextStorage.clear();
        }
    }

    notifyFileModified(filePath: string) {
        this.contextRequired = true;
    }

    captureSelectionFromActiveNote(): void {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const editorSelectionSnapshot = this.tryGetEditorSelectionSnapshot();

        // If selection exists, store it.
        if (editorSelectionSnapshot) {
            selectedContextStorage.setSelection(
                editorSelectionSnapshot.selectedText,
                activeFile.path,
                editorSelectionSnapshot.startLineNumber,
                editorSelectionSnapshot.endLineNumber
            );
            this.contextRequired = true;
            return;
        }

        // Selection is empty: clear only if user is interacting with the editor.
        // This prevents chat UI clicks/focus from clearing the badge.
        if (this.isEditorFocused()) {
            selectedContextStorage.clear();
            this.contextRequired = true;
        }
    }

    async getContext(): Promise<string> {
        let context = "";
        if (this.contextRequired) {
            const activeFileContent = await this.getActiveNoteContent();
            if (activeFileContent.trim().length > 0) {
                context += `<NOTE_CONTENT_START>\n${activeFileContent}\n<NOTE_CONTENT_END>`;
                this.contextRequired = false;
            }
        }

        const selectedContextSnapshot = selectedContextStorage.getSelection();
        if (selectedContextSnapshot?.text){
            context += `\n<SELECTED_CONTEXT_START>\n${selectedContextSnapshot.text}\n<SELECTED_CONTEXT_END>`;
        }
        return context;
    }

    getActiveNotePath(): string {
        const file = this.app.workspace.getActiveFile();
        return file?.path ?? "none";
    }

    private tryGetEditorSelectionSnapshot(): EditorSelectionSnapshot | null {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!markdownView?.editor) return null;

        const selectedText = markdownView.editor.getSelection();
        if (!selectedText?.trim()) return null;

        const fromCursor = markdownView.editor.getCursor("from");
        const toCursor = markdownView.editor.getCursor("to");

        const startLineNumber = Math.min(fromCursor.line, toCursor.line) + 1;
        const endLineNumber = Math.max(fromCursor.line, toCursor.line) + 1;

        return {
            selectedText,
            startLineNumber,
            endLineNumber
        };
    }

    private isEditorFocused(): boolean {
        const activeElement = document.activeElement as HTMLElement | null;
        if (!activeElement) return false;

        return activeElement.closest(".cm-editor") !== null;
    }

    insertTextAtCursor(textToInsert: string): boolean {
        const markdownView = this.resolveWritableMarkdownView();
        if (!markdownView?.editor) return false;

        markdownView.editor.replaceSelection(textToInsert);
        return true;
    }

    private resolveWritableMarkdownView(): MarkdownView | null {
        const activeMarkdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeMarkdownView?.editor) return activeMarkdownView;

        const markdownLeaf = this.app.workspace
            .getLeavesOfType("markdown")
            .find((workspaceLeaf) => workspaceLeaf.view instanceof MarkdownView);

        if (!markdownLeaf) return null;

        return markdownLeaf.view instanceof MarkdownView ? markdownLeaf.view : null;
    }
}