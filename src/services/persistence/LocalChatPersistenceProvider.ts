import { App, DataAdapter } from "obsidian";
import { ChatMessage } from "../../models/chat/ChatMessage";
import { DebugTurnTrace } from "../../models/debug/DebugTurnTrace";
import { ChatPersistenceProvider, PersistedConversation } from "./ChatPersistenceProvider";
import { LocalChatPersistenceProviderOptions } from "../../models/persistence/LocalChatPersistenceProviderOptions";
import { PersistedConversationFilePayload } from "../../models/persistence/PersistedConversationFilePayload";
import path from "path";

interface PersistedUserBackgroundInformationsFilePayload {
    informations: string;
    updatedAt: number;
}

export class LocalChatPersistenceProvider implements ChatPersistenceProvider {
    private readonly chatFolderPath: string;
    private readonly userBackgroundFileName = "user-background-informations.json";
    private readonly resolveConversationMessages: (chatId: string) => readonly ChatMessage[] | null;
    private readonly resolveConversationDebugTraces: (chatId: string) => readonly DebugTurnTrace[] | null;

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
        const conversationFilePaths = listResult.files.filter((filePath) => {
            if (!filePath.endsWith(".json")) return false;
            return path.basename(filePath) !== this.userBackgroundFileName;
        });

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

    async update(chatId: string): Promise<void> {
        const messagesToPersist = this.resolveConversationMessages(chatId);
        if (!messagesToPersist) return;

        const debugTracesToPersist = this.resolveConversationDebugTraces(chatId) ?? [];
        const existingConversation = await this.get(chatId);

        const persistedConversation: PersistedConversation = {
            chatId,
            title: this.buildConversationTitle(messagesToPersist),
            updatedAt: this.resolveConversationUpdatedAt(messagesToPersist, existingConversation?.updatedAt),
            messages: messagesToPersist.map((chatMessage) => ({ ...chatMessage })),
            debugTraces: debugTracesToPersist.map((debugTrace) => ({ ...debugTrace }))
        };

        const vaultAdapter = this.getVaultAdapter();
        await this.ensureBaseFolder(vaultAdapter);

        const conversationFilePath = this.buildConversationFilePath(chatId);
        const payload: PersistedConversationFilePayload = {
            chatId: persistedConversation.chatId,
            title: persistedConversation.title,
            updatedAt: persistedConversation.updatedAt,
            messages: persistedConversation.messages,
            debugTraces: persistedConversation.debugTraces
        };

        await vaultAdapter.write(conversationFilePath, JSON.stringify(payload, null, 2));
    }

    async get(chatId: string): Promise<PersistedConversation | null> {
        const vaultAdapter = this.getVaultAdapter();
        const conversationFilePath = this.buildConversationFilePath(chatId);
        const fileExists = await vaultAdapter.exists(conversationFilePath);

        if (!fileExists) return null;

        return this.readConversationFile(vaultAdapter, conversationFilePath);
    }

    async delete(chatId: string): Promise<void> {
        const vaultAdapter = this.getVaultAdapter();
        const conversationFilePath = this.buildConversationFilePath(chatId);
        const fileExists = await vaultAdapter.exists(conversationFilePath);

        if (!fileExists) return;
        await vaultAdapter.remove(conversationFilePath);
    }

    async getUserBackgroundInformations(): Promise<string> {
        const vaultAdapter = this.getVaultAdapter();
        const userBackgroundFilePath = this.buildUserBackgroundInformationsFilePath();
        const fileExists = await vaultAdapter.exists(userBackgroundFilePath);

        if (!fileExists) return "";

        try {
            const rawFileContent = await vaultAdapter.read(userBackgroundFilePath);
            const parsedPayload = JSON.parse(rawFileContent) as PersistedUserBackgroundInformationsFilePayload;

            if (typeof parsedPayload?.informations !== "string") {
                return "";
            }

            return parsedPayload.informations;
        } catch {
            return "";
        }
    }

    async setUserBackgroundInformations(informations: string): Promise<void> {
        const vaultAdapter = this.getVaultAdapter();
        await this.ensureBaseFolder(vaultAdapter);

        const payload: PersistedUserBackgroundInformationsFilePayload = {
            informations,
            updatedAt: Date.now()
        };

        await vaultAdapter.write(
            this.buildUserBackgroundInformationsFilePath(),
            JSON.stringify(payload, null, 2)
        );
    }

    private async ensureBaseFolder(vaultAdapter: DataAdapter): Promise<void> {
        const folderExists = await vaultAdapter.exists(this.chatFolderPath);
        if (folderExists) return;
        await vaultAdapter.mkdir(this.chatFolderPath);
    }

    private async readConversationFile(
        vaultAdapter: DataAdapter,
        conversationFilePath: string
    ): Promise<PersistedConversation | null> {
        try {
            const rawFileContent = await vaultAdapter.read(conversationFilePath);
            const parsedPayload = JSON.parse(rawFileContent) as PersistedConversationFilePayload;

            if (
                typeof parsedPayload?.chatId !== "string" ||
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
                chatId: parsedPayload.chatId,
                title: parsedPayload.title,
                updatedAt: parsedPayload.updatedAt,
                messages: parsedPayload.messages.map((chatMessage) => ({ ...chatMessage })),
                debugTraces: normalizedDebugTraces
            };
        } catch {
            return null;
        }
    }

    private buildConversationFilePath(chatId: string): string {
        const sanitizedchatId = chatId.replace(/[^\w\-]/g, "_");
        return `${this.chatFolderPath}/${sanitizedchatId}.json`;
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

    private getVaultAdapter(): DataAdapter {
        return this.app.vault.adapter;
    }

    private buildUserBackgroundInformationsFilePath(): string {
        return `${this.chatFolderPath}/${this.userBackgroundFileName}`;
    }
}