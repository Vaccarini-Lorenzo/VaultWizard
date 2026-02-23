import { App } from "obsidian";

export class NoteService {
    constructor(private readonly app: App) {}

    async getActiveNoteContent(): Promise<string> {
        const file = this.app.workspace.getActiveFile();
        if (!file) return "No active note is open.";
        return this.app.vault.cachedRead(file);
    }

    async getContext(): Promise<string> {
        return "todo"
    }

    getActiveNotePath(): string {
        const file = this.app.workspace.getActiveFile();
        return file?.path ?? "(none)";
    }
}