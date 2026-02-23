import { App } from "obsidian";
import { ChatMessage } from "../models/ChatMessage";
import { DebugTurnTrace } from "../models/DebugTurnTrace";
import {
    ChatPersistenceProvider as ChatPersistenceProviderContract,
    PersistedConversation
} from "../persistence/ChatPersistenceProvider";
import { LocalChatPersistenceProvider } from "../persistence/LocalChatPersistenceProvider";

export type PersistenceProviderKind = "local" | "cosmosDB";

export interface LocalPersistenceConfiguration {
    provider: "local";
    folderPath?: string;
}

export interface CosmosDbPersistenceConfiguration {
    provider: "cosmosDB";
}

export type PersistenceConfiguration =
    | LocalPersistenceConfiguration
    | CosmosDbPersistenceConfiguration;

interface PersistenceControllerDependencies {
    app: App;
    resolveConversationMessages: (conversationId: string) => readonly ChatMessage[] | null;
    resolveConversationDebugTraces: (conversationId: string) => readonly DebugTurnTrace[] | null;
}

export class PersistenceController {
    private activeProviderKind: PersistenceProviderKind = "local";
    private activeProvider: ChatPersistenceProviderContract;

    constructor(private readonly dependencies: PersistenceControllerDependencies) {
        this.activeProvider = this.createLocalProvider();
    }

    configure(configuration: PersistenceConfiguration): void {
        if (configuration.provider === "local") {
            this.activeProviderKind = "local";
            this.activeProvider = this.createLocalProvider(configuration.folderPath);
            return;
        }

        this.activeProviderKind = "cosmosDB";
        throw new Error("CosmosDB persistence provider is not implemented yet.");
    }

    getProviderKind(): PersistenceProviderKind {
        return this.activeProviderKind;
    }

    getMostRecent(maxConversationCount: number): Promise<readonly PersistedConversation[]> {
        return this.activeProvider.getMostRecent(maxConversationCount);
    }

    update(conversationId: string): Promise<void> {
        return this.activeProvider.update(conversationId);
    }

    get(conversationId: string): Promise<PersistedConversation | null> {
        return this.activeProvider.get(conversationId);
    }

    private createLocalProvider(folderPath?: string): ChatPersistenceProviderContract {
        return new LocalChatPersistenceProvider(this.dependencies.app, {
            folderPath,
            resolveConversationMessages: this.dependencies.resolveConversationMessages,
            resolveConversationDebugTraces: this.dependencies.resolveConversationDebugTraces
        });
    }
}