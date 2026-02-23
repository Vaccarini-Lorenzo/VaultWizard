import { App } from "obsidian";
import { ConfiguredModel } from "../models/ConfiguredModel";
import path from "path";

interface ModelSettingsFileContent {
    models: ConfiguredModel[];
}

export class ModelSettingsRepository {

    private readonly settingsFilePath: string;
    private readonly pluginFolderPath: string;

    constructor(private readonly app: App) {
        const basePath = (this.app.vault.adapter as any)?.basePath ?? (window as any)?.app?.vault?.adapter?.basePath;
        this.pluginFolderPath = path.join(".obsidian", "plugins", "vault_wizard");
        this.settingsFilePath = path.join(this.pluginFolderPath, ".model_settings.json");
    }

    async loadModels(): Promise<ConfiguredModel[]> {
        const vaultAdapter = this.app.vault.adapter as any;
        try {
            const rawContent = await vaultAdapter.read(this.settingsFilePath);
            const parsedContent = JSON.parse(rawContent) as Partial<ModelSettingsFileContent>;
            return Array.isArray(parsedContent.models) ? parsedContent.models : [];
        } catch {
            return [];
        }
    }

    async saveModels(models: readonly ConfiguredModel[]): Promise<void> {
        const vaultAdapter = this.app.vault.adapter as any;
        await this.ensurePluginFolder(vaultAdapter);

        const fileContent: ModelSettingsFileContent = {
            models: [...models]
        };

        await vaultAdapter.write(this.settingsFilePath, JSON.stringify(fileContent, null, 2));
    }

    private async ensurePluginFolder(vaultAdapter: any): Promise<void> {
        try {
            await vaultAdapter.mkdir(this.pluginFolderPath);
        } catch {
            // Folder may already exist.
        }
    }
}