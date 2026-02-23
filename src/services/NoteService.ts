import { App } from "obsidian";

export class NoteService {
    private contextRequired: boolean;

    constructor(private readonly app: App) {
        this.contextRequired = true;
    }

    async getActiveNoteContent(): Promise<string> {
        const file = this.app.workspace.getActiveFile();
        if (!file) return "No active note is open.";
        return this.app.vault.cachedRead(file);
    }

    notifyFileOpened(filePath: string) {
        this.contextRequired = true;
    }

    notifyFileModified(filePath: string) {
        this.contextRequired = true;
    }   

    async getContext(): Promise<string> {
        console.log("Getting context...");
        if (this.contextRequired && this.app.workspace.getActiveFile()) {
            this.contextRequired = false;
            console.log("Context is required, fetching active note content...");
            return await this.getActiveNoteContent();
        }
        console.log(this.contextRequired ? "Context is required but no active file found." : "Context is not required, returning empty string.");
        return "";

    }

    getActiveNotePath(): string {
        const file = this.app.workspace.getActiveFile();
        return file?.path ?? "(none)";
    }
}