import { App } from "obsidian";
import { ConfiguredModel } from "../models/ConfiguredModel";

interface ModelSettingsFileContent {
    models: ConfiguredModel[];
}

export class ModelSettingsRepository {
    private readonly settingsFilePath = ".obsidian/plugins/vault_wizard/.model_settings.json";
    private readonly pluginFolderPath = ".obsidian/plugins/vault_wizard";

    constructor(private readonly app: App) {}

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