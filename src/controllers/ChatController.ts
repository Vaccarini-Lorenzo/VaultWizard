import { selectedContextStorage } from "services/SelectedContextStorage";
import { ChatMessage } from "../models/ChatMessage";
import { ConfiguredModel, NewConfiguredModelInput } from "../models/ConfiguredModel";
import { DebugTurnTrace } from "../models/DebugTurnTrace";
import { TokenUsage } from "../models/TokenUsage";
import { UiPanel } from "../models/UiPanel";
import { ConversationIdFactory } from "../services/ConversationIdFactory";
import { currentChatStorage } from "../services/CurrentChatStorage";
import { debugTraceStorage } from "../services/DebugTraceStorage";
import { ModelSettingsRepository } from "../services/ModelSettingsRepository";
import { NoteService } from "../services/NoteService";
import { SelectedModelState } from "../state/SelectedModelState";
import { LLMController } from "./LLMController";
import {
    ChatPersistenceProvider,
    ChatPersistenceSettings,
    createDefaultChatPersistenceSettings
} from "../models/ChatPersistenceSettings";
import { ChatHistorySession } from "../models/ChatHistorySession";
import { PersistenceController } from "./PersistenceController";

type Listener = () => void;

export class ChatController {
    private readonly listeners = new Set<Listener>();
    private readonly configuredModels: ConfiguredModel[] = [];
    private readonly maxChatHistorySessions = 50;

    private activePanel: UiPanel = "chat";
    private streaming = false;
    private conversationId: string;
    private chatPersistenceSettings: ChatPersistenceSettings = createDefaultChatPersistenceSettings();
    private chatHistorySessions: ChatHistorySession[] = [];

    constructor(
        private readonly noteService: NoteService,
        private readonly llmController: LLMController,
        private readonly modelSettingsRepository: ModelSettingsRepository,
        private readonly selectedModelState: SelectedModelState,
        private readonly conversationIdFactory: ConversationIdFactory,
        private readonly persistenceController: PersistenceController
    ) {
        this.conversationId = this.conversationIdFactory.createConversationId();
        currentChatStorage.clear(this.conversationId);
        debugTraceStorage.clear(this.conversationId);
    }

    async initialize(): Promise<void> {
        const loadedConfiguredModels = await this.modelSettingsRepository.loadModels();
        this.configuredModels.splice(0, this.configuredModels.length, ...loadedConfiguredModels);

        if (loadedConfiguredModels.length > 0) {
            this.selectedModelState.setSelectedModel(loadedConfiguredModels[0]);
        } else {
            this.selectedModelState.setSelectedModel(null);
        }

        this.applyLocalPersistenceConfiguration();
        await this.refreshChatHistorySessions();
        this.notify();
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getConversationId(): string {
        return this.conversationId;
    }

    resetChatAndStartNewConversation(): void {
        this.persistCurrentConversationIfNeeded();

        this.conversationId = this.conversationIdFactory.createConversationId();
        currentChatStorage.clear(this.conversationId);
        debugTraceStorage.clear(this.conversationId);
        this.streaming = false;
        this.notify();
    }

    getConfiguredModels(): readonly ConfiguredModel[] {
        return this.configuredModels;
    }

    getSelectedConfiguredModel(): ConfiguredModel | null {
        return this.selectedModelState.getSelectedModel();
    }

    selectConfiguredModelById(configuredModelId: string): void {
        const nextSelectedModel =
            this.configuredModels.find((configuredModel) => configuredModel.id === configuredModelId) ?? null;

        this.selectedModelState.setSelectedModel(nextSelectedModel);
        this.notify();
    }

    getActivePanel(): UiPanel {
        return this.activePanel;
    }

    isStreaming(): boolean {
        return this.streaming;
    }

    getActiveNotePath(): string {
        return this.noteService.getActiveNotePath();
    }

    getDebugTurns(): readonly DebugTurnTrace[] {
        return debugTraceStorage.getTraces();
    }

    getAggregateTokenUsage(): TokenUsage {
        return debugTraceStorage.getAggregateTokenUsage();
    }

    getChatPersistenceSettings(): ChatPersistenceSettings {
        return this.clonePersistenceSettings(this.chatPersistenceSettings);
    }

    setChatPersistenceProvider(provider: ChatPersistenceProvider): void {
        if (provider === this.chatPersistenceSettings.provider) return;

        if (provider === "local") {
            this.chatPersistenceSettings = {
                provider: "local",
                useCustomFolderPath: false,
                folderPath: ""
            };

            this.applyLocalPersistenceConfiguration();
            this.notify();
            return;
        }

        this.chatPersistenceSettings = {
            provider: "cosmosDB",
            endpoint: "",
            key: "",
            databaseId: "",
            containerId: ""
        };

        this.notify();
    }

    updateLocalChatPersistenceSettings(nextValues: {
        useCustomFolderPath?: boolean;
        folderPath?: string;
    }): void {
        if (this.chatPersistenceSettings.provider !== "local") return;

        this.chatPersistenceSettings = {
            ...this.chatPersistenceSettings,
            ...nextValues
        };

        this.applyLocalPersistenceConfiguration();
        this.notify();
    }

    updateCosmosDbChatPersistenceSettings(nextValues: {
        endpoint?: string;
        key?: string;
        databaseId?: string;
        containerId?: string;
    }): void {
        if (this.chatPersistenceSettings.provider !== "cosmosDB") return;

        this.chatPersistenceSettings = {
            ...this.chatPersistenceSettings,
            ...nextValues
        };
        this.notify();
    }

    getChatHistorySessions(): readonly ChatHistorySession[] {
        return this.chatHistorySessions;
    }

    openConversationFromHistory(conversationId: string): void {
        const existingSession = this.chatHistorySessions.find(
            (chatHistorySession) => chatHistorySession.conversationId === conversationId
        );
        if (!existingSession) return;

        this.persistCurrentConversationIfNeeded();

        this.conversationId = existingSession.conversationId;
        currentChatStorage.replaceConversation(
            existingSession.conversationId,
            existingSession.messages.map((chatMessage) => ({ ...chatMessage }))
        );
        this.streaming = false;
        this.notify();
    }

    async saveConfiguredModel(newConfiguredModelInput: NewConfiguredModelInput): Promise<void> {
        const sanitizedModelName = newConfiguredModelInput.modelName.trim();
        if (!sanitizedModelName) return;

        const configuredModelToPersist: ConfiguredModel = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            provider: newConfiguredModelInput.provider,
            modelName: sanitizedModelName,
            settings: newConfiguredModelInput.settings,
            createdAt: Date.now()
        };

        const nextConfiguredModels = [...this.configuredModels, configuredModelToPersist];
        await this.modelSettingsRepository.saveModels(nextConfiguredModels);

        this.configuredModels.splice(0, this.configuredModels.length, ...nextConfiguredModels);

        if (!this.selectedModelState.getSelectedModel()) {
            this.selectedModelState.setSelectedModel(configuredModelToPersist);
        }

        this.notify();
    }

    openChatPanel(): void {
        this.setActivePanel("chat");
    }

    openDebugPanel(): void {
        this.setActivePanel("debug");
    }

    openSettingsPanel(): void {
        this.setActivePanel("settings");
    }

    openAddModelPanel(): void {
        this.setActivePanel("add-model");
    }

    returnToSettingsPanel(): void {
        this.setActivePanel("settings");
    }

    async onUserMessage(rawInput: string): Promise<void> {
        const input = rawInput.trim();
        const context = await this.noteService.getContext();

        if (!input || this.streaming) return;

        currentChatStorage.appendMessage({
            role: "user",
            content: input,
            timestamp: Date.now()
        });

        if (input === "/c") {
            currentChatStorage.appendMessage({
                role: "developer",
                content: context,
                timestamp: Date.now()
            });
            this.persistCurrentConversationIfNeeded();
            this.notify();
            return;
        }

        const contextMessage: ChatMessage = {
            role: "developer",
            content: context,
            timestamp: Date.now()
        };
        
        currentChatStorage.appendMessage(contextMessage);

        const assistantMessage: ChatMessage = {
            role: "assistant",
            content: "",
            timestamp: Date.now()
        };

        currentChatStorage.appendMessage(assistantMessage);

        const selectedContextSnapshot = this.serializeSelectedContext(selectedContextStorage.getSelection());
        const selectedConfiguredModel = this.selectedModelState.getSelectedModel();

        selectedContextStorage.clear();

        this.streaming = true;
        this.notify();

        let capturedTokenUsage: TokenUsage | null = null;
        let capturedErrorMessage: string | null = null;

        try {
            const invocationResult = await this.llmController.streamAssistantReply(input, (chunk) => {
                assistantMessage.content += chunk;
                this.notify();
            });

            capturedTokenUsage = invocationResult.tokenUsage ?? null;
        } catch (error) {
            capturedErrorMessage = error instanceof Error ? error.message : "Unexpected LLM error.";
            assistantMessage.content += `\n${capturedErrorMessage}`;
        } finally {
            debugTraceStorage.appendTrace({
                timestamp: Date.now(),
                userPrompt: input,
                context,
                assistantResponse: assistantMessage.content,
                tokenUsage: capturedTokenUsage,
                request: {
                    prompt: input,
                    context,
                    selectedContext: selectedContextSnapshot
                },
                responseMetadata: {
                    conversationId: this.conversationId,
                    provider: selectedConfiguredModel?.provider ?? null,
                    modelName: selectedConfiguredModel?.modelName ?? null,
                    configuredModelId: selectedConfiguredModel?.id ?? null,
                    completedAt: Date.now(),
                    hadError: capturedErrorMessage !== null,
                    errorMessage: capturedErrorMessage
                }
            });

            this.streaming = false;
            this.persistCurrentConversationIfNeeded();
            this.notify();
        }
    }

    private setActivePanel(nextPanel: UiPanel): void {
        if (this.activePanel === nextPanel) return;
        this.activePanel = nextPanel;
        this.notify();
    }

    private notify(): void {
        for (const listener of this.listeners) listener();
    }

    private serializeSelectedContext(selectedContext: unknown): string | null {
        if (selectedContext === null || selectedContext === undefined) {
            return null;
        }

        if (typeof selectedContext === "string") {
            const trimmedSelectedContext = selectedContext.trim();
            return trimmedSelectedContext.length > 0 ? trimmedSelectedContext : null;
        }

        try {
            return JSON.stringify(selectedContext, null, 2);
        } catch {
            return String(selectedContext);
        }
    }

    private clonePersistenceSettings(
        chatPersistenceSettings: ChatPersistenceSettings
    ): ChatPersistenceSettings {
        return JSON.parse(JSON.stringify(chatPersistenceSettings)) as ChatPersistenceSettings;
    }

    private persistCurrentConversationIfNeeded(): void {
        const chatMessages = currentChatStorage.getMessages();
        const hasUserOrAssistantMessage = chatMessages.some((chatMessage) => {
            return chatMessage.role === "user" || chatMessage.role === "assistant";
        });

        if (!hasUserOrAssistantMessage) return;

        const conversationIdToPersist = this.conversationId;

        void this.persistenceController
            .update(conversationIdToPersist)
            .then(async () => {
                await this.refreshChatHistorySessions();
            })
            .catch(() => undefined);
    }

    private async refreshChatHistorySessions(): Promise<void> {
        const persistedConversations = await this.persistenceController.getMostRecent(this.maxChatHistorySessions);

        this.chatHistorySessions = persistedConversations.map((persistedConversation) => ({
            conversationId: persistedConversation.conversationId,
            title: persistedConversation.title,
            updatedAt: persistedConversation.updatedAt,
            messages: persistedConversation.messages.map((chatMessage) => ({ ...chatMessage }))
        }));
    }

    private applyLocalPersistenceConfiguration(): void {
        if (this.chatPersistenceSettings.provider !== "local") return;

        const customFolderPath = this.chatPersistenceSettings.useCustomFolderPath
            ? this.chatPersistenceSettings.folderPath.trim()
            : "";

        this.persistenceController.configure({
            provider: "local",
            folderPath: customFolderPath || undefined
        });

        void this.refreshChatHistorySessions();
    }
}