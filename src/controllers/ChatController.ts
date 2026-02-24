import { ChatMessage } from "../models/chat/ChatMessage";
import { ConfiguredModel, NewConfiguredModelInput } from "../models/llm/ConfiguredModel";
import { DebugTurnTrace } from "../models/debug/DebugTurnTrace";
import { TokenUsage } from "../models/llm/TokenUsage";
import { UiPanel } from "../models/misc/UiPanel";
import { ChatIdFactory } from "../services/chat/ChatIdFactory";
import { currentChatStorage } from "../services/chat/CurrentChatStorage";
import { debugTraceStorage } from "../services/debug/DebugTraceStorage";
import { ModelSettingsState } from "../services/state/ModelSettingsState";
import { NoteService } from "../services/context/NoteService";
import { SelectedModelState } from "../services/state/SelectedModelState";
import { LLMController } from "./LLMController";
import { ChatPersistenceProvider, ChatPersistenceSettings, createDefaultChatPersistenceSettings } from "../models/chat/ChatPersistenceSettings";
import { ChatHistorySession } from "../models/chat/ChatHistorySession";
import { PersistenceController } from "./PersistenceController";
import { createConversationEmbedMarkdown } from "../services/chat/ChatEmbedLinkBuilder";
import { selectedContextStorage } from "services/context/SelectedContextStorage";


type Listener = () => void;

export class ChatController {
    private readonly listeners = new Set<Listener>();
    private readonly configuredModels: ConfiguredModel[] = [];
    private readonly maxChatHistorySessions = 50;

    private activePanel: UiPanel = "chat";
    private streaming = false;
    private chatId: string;
    private chatPersistenceSettings: ChatPersistenceSettings = createDefaultChatPersistenceSettings();
    private chatHistorySessions: ChatHistorySession[] = [];
    private editingConfiguredModelId: string | null = null;

    constructor(
        private readonly noteService: NoteService,
        private readonly llmController: LLMController,
        private readonly modelSettingsState: ModelSettingsState,
        private readonly selectedModelState: SelectedModelState,
        private readonly chatIdFactory: ChatIdFactory , private readonly persistenceController: PersistenceController) {
        this.chatId = this.chatIdFactory.createchatId();
        currentChatStorage.clear(this.chatId);
        debugTraceStorage.clear(this.chatId);
    }

    async initialize(): Promise<void> {
        const loadedConfiguredModels = await this.modelSettingsState.loadModels();
        this.configuredModels.splice(0, this.configuredModels.length, ...loadedConfiguredModels);
        this.editingConfiguredModelId = null;

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

    getchatId(): string {
        return this.chatId;
    }

    resetChatAndStartNewConversation(): void {
        this.persistCurrentConversationIfNeeded();

        this.chatId = this.chatIdFactory
.createchatId();
 currentChatStorage.clear(this.chatId);
        debugTraceStorage.clear(this.chatId);
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

    async openConversationById(chatId: string): Promise<boolean> {
        const sanitizedchatId = chatId.trim();
        if (!sanitizedchatId) return false;

        const historySession = this.chatHistorySessions.find(
            (chatHistorySession) => chatHistorySession.chatId === sanitizedchatId
        );

        if (historySession) {
            this.applyConversationSnapshot(
                historySession.chatId,
                historySession.messages,
                historySession.debugTraces
            );
            return true;
        }

        const persistedConversation = await this.persistenceController.get(sanitizedchatId);
        if (!persistedConversation) return false;

        this.applyConversationSnapshot(
            persistedConversation.chatId,
            persistedConversation.messages,
            persistedConversation.debugTraces
        );

        await this.refreshChatHistorySessions();
        return true;
    }

    openConversationFromHistory(chatId: string): void {
        const existingSession = this.chatHistorySessions.find(
            (chatHistorySession) => chatHistorySession.chatId === chatId
        );
        if (!existingSession) return;

        this.applyConversationSnapshot(
            existingSession.chatId,
            existingSession.messages,
            existingSession.debugTraces
        );
    }

    getEditingConfiguredModel(): ConfiguredModel | null {
        if (!this.editingConfiguredModelId) return null;

        return (
            this.configuredModels.find(
                (configuredModel) => configuredModel.id === this.editingConfiguredModelId
            ) ?? null
        );
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
        await this.modelSettingsState.saveModels(nextConfiguredModels);

        this.configuredModels.splice(0, this.configuredModels.length, ...nextConfiguredModels);

        if (!this.selectedModelState.getSelectedModel()) {
            this.selectedModelState.setSelectedModel(configuredModelToPersist);
        }

        this.notify();
    }

    async updateConfiguredModel(
        configuredModelId: string,
        nextConfiguredModelInput: NewConfiguredModelInput
    ): Promise<void> {
        const sanitizedModelName = nextConfiguredModelInput.modelName.trim();
        if (!sanitizedModelName) return;

        const existingConfiguredModelIndex = this.configuredModels.findIndex(
            (configuredModel) => configuredModel.id === configuredModelId
        );
        if (existingConfiguredModelIndex < 0) return;

        const existingConfiguredModel = this.configuredModels[existingConfiguredModelIndex];
        const updatedConfiguredModel: ConfiguredModel = {
            ...existingConfiguredModel,
            provider: nextConfiguredModelInput.provider,
            modelName: sanitizedModelName,
            settings: { ...nextConfiguredModelInput.settings }
        };

        const nextConfiguredModels = [...this.configuredModels];
        nextConfiguredModels[existingConfiguredModelIndex] = updatedConfiguredModel;

        await this.modelSettingsState.saveModels(nextConfiguredModels);
        this.configuredModels.splice(0, this.configuredModels.length, ...nextConfiguredModels);

        const selectedConfiguredModel = this.selectedModelState.getSelectedModel();
        if (selectedConfiguredModel?.id === configuredModelId) {
            this.selectedModelState.setSelectedModel(updatedConfiguredModel);
        }

        this.notify();
    }

    async deleteConfiguredModel(configuredModelId: string): Promise<void> {
        const nextConfiguredModels = this.configuredModels.filter(
            (configuredModel) => configuredModel.id !== configuredModelId
        );
        if (nextConfiguredModels.length === this.configuredModels.length) return;

        await this.modelSettingsState.saveModels(nextConfiguredModels);
        this.configuredModels.splice(0, this.configuredModels.length, ...nextConfiguredModels);

        const selectedConfiguredModel = this.selectedModelState.getSelectedModel();
        if (selectedConfiguredModel?.id === configuredModelId) {
            this.selectedModelState.setSelectedModel(nextConfiguredModels[0] ?? null);
        }

        if (this.editingConfiguredModelId === configuredModelId) {
            this.editingConfiguredModelId = null;
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
        this.editingConfiguredModelId = null;
        this.setActivePanel("add-model");
    }

    openEditModelPanel(configuredModelId: string): void {
        const existingConfiguredModel = this.configuredModels.find(
            (configuredModel) => configuredModel.id === configuredModelId
        );
        if (!existingConfiguredModel) return;

        this.editingConfiguredModelId = configuredModelId;
        this.setActivePanel("add-model");
    }

    returnToSettingsPanel(): void {
        this.editingConfiguredModelId = null;
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
                    chatId: this.chatId,
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

    embedCurrentConversationReferenceInActiveNote(): boolean {
        const conversationEmbedMarkdown = createConversationEmbedMarkdown(this.chatId);
        if (!conversationEmbedMarkdown) return false;

        return this.noteService.insertTextAtCursor(conversationEmbedMarkdown);
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

        const chatIdToPersist = this.chatId;

        void this.persistenceController
            .update(chatIdToPersist)
            .then(async () => {
                await this.refreshChatHistorySessions();
            })
            .catch(() => undefined);
    }

    private async refreshChatHistorySessions(): Promise<void> {
        const persistedConversations = await this.persistenceController.getMostRecent(this.maxChatHistorySessions);

        this.chatHistorySessions = persistedConversations.map((persistedConversation) => ({
            chatId: persistedConversation.chatId,
            title: persistedConversation.title,
            updatedAt: persistedConversation.updatedAt,
            messages: persistedConversation.messages.map((chatMessage: ChatMessage) => ({ ...chatMessage })),
            debugTraces: persistedConversation.debugTraces.map((debugTrace: DebugTurnTrace) => ({ ...debugTrace }))
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

    private applyConversationSnapshot(
        chatId: string,
        messages: readonly ChatMessage[],
        debugTraces: readonly DebugTurnTrace[]
    ): void {
        this.persistCurrentConversationIfNeeded();

        this.chatId = chatId;
        currentChatStorage.replaceConversation(
            chatId,
            messages.map((chatMessage) => ({ ...chatMessage }))
        );
        debugTraceStorage.replaceTraces(
            chatId,
            debugTraces.map((debugTrace) => ({ ...debugTrace }))
        );

        this.streaming = false;
        this.activePanel = "chat";
        this.notify();
    }
}