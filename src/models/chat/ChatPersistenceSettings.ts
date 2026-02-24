export type ChatPersistenceProvider = "local" | "cosmosDB";

export interface LocalChatPersistenceSettings {
    provider: "local";
    useCustomFolderPath: boolean;
    folderPath: string;
}

export interface CosmosDbChatPersistenceSettings {
    provider: "cosmosDB";
    endpoint: string;
    key: string;
    databaseId: string;
    containerId: string;
}

export type ChatPersistenceSettings =
    | LocalChatPersistenceSettings
    | CosmosDbChatPersistenceSettings;

export function createDefaultChatPersistenceSettings(): ChatPersistenceSettings {
    return {
        provider: "local",
        useCustomFolderPath: false,
        folderPath: ""
    };
}