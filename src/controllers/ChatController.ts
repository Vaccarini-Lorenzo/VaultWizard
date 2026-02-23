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

type Listener = () => void;

export class ChatController {
    private readonly listeners = new Set<Listener>();
    private readonly configuredModels: ConfiguredModel[] = [];

    private activePanel: UiPanel = "chat";
    private streaming = false;
    private conversationId: string;

    constructor(
        private readonly noteService: NoteService,
        private readonly llmController: LLMController,
        private readonly modelSettingsRepository: ModelSettingsRepository,
        private readonly selectedModelState: SelectedModelState,
        private readonly conversationIdFactory: ConversationIdFactory
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
                role: "tool",
                content: context,
                timestamp: Date.now()
            });
            this.notify();
            return;
        }

        const contextMessage: ChatMessage = {
            role: "tool",
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

        this.streaming = true;
        this.notify();

        let capturedTokenUsage: TokenUsage | null = null;

        try {
            const invocationResult = await this.llmController.streamAssistantReply(input, (chunk) => {
                assistantMessage.content += chunk;
                this.notify();
            });

            capturedTokenUsage = invocationResult.tokenUsage ?? null;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unexpected LLM error.";
            assistantMessage.content += `\n${errorMessage}`;
        } finally {
            debugTraceStorage.appendTrace({
                timestamp: Date.now(),
                userPrompt: input,
                context,
                assistantResponse: assistantMessage.content,
                tokenUsage: capturedTokenUsage
            });

            this.streaming = false;
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
}