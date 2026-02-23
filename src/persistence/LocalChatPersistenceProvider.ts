import { App } from "obsidian";
import { ChatMessage } from "../models/ChatMessage";
import { DebugTurnTrace } from "../models/DebugTurnTrace";
import { ChatPersistenceProvider, PersistedConversation } from "./ChatPersistenceProvider";
import path from "path";

interface LocalChatPersistenceProviderOptions {
    folderPath?: string;
    resolveConversationMessages: (conversationId: string) => readonly ChatMessage[] | null;
    resolveConversationDebugTraces: (conversationId: string) => readonly DebugTurnTrace[] | null;
}

interface VaultAdapterListResult {
    files: string[];
    folders: string[];
}

interface VaultAdapterLike {
    exists(path: string): Promise<boolean>;
    mkdir(path: string): Promise<void>;
    read(path: string): Promise<string>;
    write(path: string, data: string): Promise<void>;
    list(path: string): Promise<VaultAdapterListResult>;
}

interface PersistedConversationFilePayload {
    conversationId: string;
    title: string;
    updatedAt: number;
    messages: ChatMessage[];
    debugTraces?: DebugTurnTrace[];
}

export class LocalChatPersistenceProvider implements ChatPersistenceProvider {
    private readonly chatFolderPath: string;
    private readonly resolveConversationMessages: (conversationId: string) => readonly ChatMessage[] | null;
    private readonly resolveConversationDebugTraces: (conversationId: string) => readonly DebugTurnTrace[] | null;

    constructor(private readonly app: App, options: LocalChatPersistenceProviderOptions) {
        this.chatFolderPath = options.folderPath?.trim() || path.join(".obsidian", "plugins", "vault_wizard", "chats");
        this.resolveConversationMessages = options.resolveConversationMessages;
        this.resolveConversationDebugTraces = options.resolveConversationDebugTraces;
    }

    async getMostRecent(maxConversationCount: number): Promise<readonly PersistedConversation[]> {
        const vaultAdapter = this.getVaultAdapter();
        const folderExists = await vaultAdapter.exists(this.chatFolderPath);

        if (!folderExists) return [];

        const listResult = await vaultAdapter.list(this.chatFolderPath);
        const conversationFilePaths = listResult.files.filter((filePath) => filePath.endsWith(".json"));

        const loadedConversations = await Promise.all(
            conversationFilePaths.map((conversationFilePath) => this.readConversationFile(vaultAdapter, conversationFilePath))
        );

        const validConversations = loadedConversations.filter(
            (conversation): conversation is PersistedConversation => conversation !== null
        );

        const sortedConversations = validConversations.sort(
            (firstConversation, secondConversation) => secondConversation.updatedAt - firstConversation.updatedAt
        );

        return sortedConversations.slice(0, Math.max(0, maxConversationCount));
    }

    async update(conversationId: string): Promise<void> {
        const messagesToPersist = this.resolveConversationMessages(conversationId);
        if (!messagesToPersist) return;

        const debugTracesToPersist = this.resolveConversationDebugTraces(conversationId) ?? [];
        const existingConversation = await this.get(conversationId);

        const persistedConversation: PersistedConversation = {
            conversationId,
            title: this.buildConversationTitle(messagesToPersist),
            updatedAt: this.resolveConversationUpdatedAt(messagesToPersist, existingConversation?.updatedAt),
            messages: messagesToPersist.map((chatMessage) => ({ ...chatMessage })),
            debugTraces: debugTracesToPersist.map((debugTrace) => ({ ...debugTrace }))
        };

        const vaultAdapter = this.getVaultAdapter();
        await this.ensureBaseFolder(vaultAdapter);

        const conversationFilePath = this.buildConversationFilePath(conversationId);
        const payload: PersistedConversationFilePayload = {
            conversationId: persistedConversation.conversationId,
            title: persistedConversation.title,
            updatedAt: persistedConversation.updatedAt,
            messages: persistedConversation.messages,
            debugTraces: persistedConversation.debugTraces
        };

        await vaultAdapter.write(conversationFilePath, JSON.stringify(payload, null, 2));
    }

    async get(conversationId: string): Promise<PersistedConversation | null> {
        const vaultAdapter = this.getVaultAdapter();
        const conversationFilePath = this.buildConversationFilePath(conversationId);
        const fileExists = await vaultAdapter.exists(conversationFilePath);

        if (!fileExists) return null;

        return this.readConversationFile(vaultAdapter, conversationFilePath);
    }

    private async ensureBaseFolder(vaultAdapter: VaultAdapterLike): Promise<void> {
        const folderExists = await vaultAdapter.exists(this.chatFolderPath);
        if (folderExists) return;
        await vaultAdapter.mkdir(this.chatFolderPath);
    }

    private async readConversationFile(
        vaultAdapter: VaultAdapterLike,
        conversationFilePath: string
    ): Promise<PersistedConversation | null> {
        try {
            const rawFileContent = await vaultAdapter.read(conversationFilePath);
            const parsedPayload = JSON.parse(rawFileContent) as PersistedConversationFilePayload;

            if (
                typeof parsedPayload?.conversationId !== "string" ||
                typeof parsedPayload?.title !== "string" ||
                typeof parsedPayload?.updatedAt !== "number" ||
                !Array.isArray(parsedPayload?.messages)
            ) {
                return null;
            }

            const normalizedDebugTraces = Array.isArray(parsedPayload.debugTraces)
                ? parsedPayload.debugTraces.map((debugTrace) => ({ ...debugTrace }))
                : [];

            return {
                conversationId: parsedPayload.conversationId,
                title: parsedPayload.title,
                updatedAt: parsedPayload.updatedAt,
                messages: parsedPayload.messages.map((chatMessage) => ({ ...chatMessage })),
                debugTraces: normalizedDebugTraces
            };
        } catch {
            return null;
        }
    }

    private buildConversationFilePath(conversationId: string): string {
        const sanitizedConversationId = conversationId.replace(/[^\w\-]/g, "_");
        return `${this.chatFolderPath}/${sanitizedConversationId}.json`;
    }

    private buildConversationTitle(messages: readonly ChatMessage[]): string {
        const firstUserMessage = messages.find((chatMessage) => chatMessage.role === "user");
        const normalizedTitle = firstUserMessage?.content?.trim().replace(/\s+/g, " ") ?? "";

        if (!normalizedTitle) return "Untitled chat";
        if (normalizedTitle.length <= 48) return normalizedTitle;

        return `${normalizedTitle.slice(0, 48)}…`;
    }

    private resolveConversationUpdatedAt(
        messages: readonly ChatMessage[],
        existingUpdatedAt?: number
    ): number {
        const latestMessageTimestamp = messages.reduce<number>((currentLatestTimestamp, chatMessage) => {
            if (typeof chatMessage.timestamp !== "number") return currentLatestTimestamp;
            return Math.max(currentLatestTimestamp, chatMessage.timestamp);
        }, 0);

        if (latestMessageTimestamp > 0) {
            return Math.max(existingUpdatedAt ?? 0, latestMessageTimestamp);
        }

        if (typeof existingUpdatedAt === "number") {
            return existingUpdatedAt;
        }

        return Date.now();
    }

    private getVaultAdapter(): VaultAdapterLike {
        return this.app.vault.adapter as unknown as VaultAdapterLike;
    }
}