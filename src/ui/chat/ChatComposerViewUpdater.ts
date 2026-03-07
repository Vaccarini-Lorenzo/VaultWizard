import { chatComposerDraftStorage } from "services/chat/ChatComposerDraftStorage";

interface ChatComposerViewState {
    isSendBlocked: boolean;
}

type SendMessageHandler = (value: string) => Promise<void>;

export class ChatComposerViewUpdater {
    private readonly composerElement: HTMLElement;
    private readonly inputElement: HTMLTextAreaElement;
    private readonly sendButtonElement: HTMLButtonElement;

    private isSendBlocked = false;

    constructor(
        container: HTMLElement,
        private readonly onSendMessage: SendMessageHandler,
        private readonly onComposerInteraction?: () => void
    ) {
        this.composerElement = container.createDiv({ cls: "vault-wizard-composer" });
        this.inputElement = this.composerElement.createEl("textarea", {
            cls: "vault-wizard-input",
            attr: { placeholder: "Type message (/c for current note content)..." }
        });
        this.sendButtonElement = this.composerElement.createEl("button", {
            cls: "vault-wizard-send-btn",
            text: "Send"
        });

        this.inputElement.value = chatComposerDraftStorage.loadText();

        this.bindEvents();
    }

    sync(nextState: ChatComposerViewState): void {
        this.isSendBlocked = nextState.isSendBlocked;
        this.sendButtonElement.disabled = this.isSendBlocked;
        this.sendButtonElement.textContent = this.isSendBlocked ? "..." : "Send";
    }

    private bindEvents(): void {
        const notifyComposerInteraction = () => {
            this.onComposerInteraction?.();
        };

        this.composerElement.addEventListener("mousedown", notifyComposerInteraction);
        this.inputElement.addEventListener("focus", notifyComposerInteraction);

        this.inputElement.addEventListener("input", () => {
            chatComposerDraftStorage.saveDraft(this.inputElement.value);
        });

        this.sendButtonElement.addEventListener("click", async () => {
            await this.submitMessage();
        });

        this.inputElement.addEventListener("keydown", async (keyboardEvent) => {
            if (keyboardEvent.key === "Enter" && !keyboardEvent.shiftKey) {
                keyboardEvent.preventDefault();
                await this.submitMessage();
            }
        });
    }

    private async submitMessage(): Promise<void> {
        if (this.isSendBlocked) return;

        const messageToSend = this.inputElement.value;
        this.inputElement.value = "";
        chatComposerDraftStorage.clearDraft();
        await this.onSendMessage(messageToSend);
    }
}