import { chatComposerDraftStorage } from "services/chat/ChatComposerDraftStorage";

interface ChatComposerViewState {
    isSendBlocked: boolean;
}

type SendMessageHandler = (value: string) => Promise<void>;

export class ChatComposerViewUpdater {
    private readonly composerElement: HTMLElement;
    private readonly inputElement: HTMLTextAreaElement;
    private readonly sendButtonElement: HTMLButtonElement;

    private readonly minimumInputHeightPx = 70;
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
        this.adjustInputHeightToContent();

        this.bindEvents();
    }

    sync(nextState: ChatComposerViewState): void {
        this.isSendBlocked = nextState.isSendBlocked;
        this.sendButtonElement.disabled = this.isSendBlocked;
        this.sendButtonElement.textContent = this.isSendBlocked ? "..." : "Send";
        this.adjustInputHeightToContent();
    }

    private bindEvents(): void {
        const notifyComposerInteraction = () => {
            this.onComposerInteraction?.();
        };

        this.composerElement.addEventListener("mousedown", notifyComposerInteraction);
        this.inputElement.addEventListener("focus", notifyComposerInteraction);

        this.inputElement.addEventListener("input", () => {
            chatComposerDraftStorage.saveDraft(this.inputElement.value);
            this.adjustInputHeightToContent();
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
        this.resetInputHeight();
        await this.onSendMessage(messageToSend);
    }

    private adjustInputHeightToContent(): void {
        this.inputElement.style.height = "auto";
        const nextInputHeightPx = Math.max(this.minimumInputHeightPx, this.inputElement.scrollHeight);
        this.inputElement.style.height = `${nextInputHeightPx}px`;
    }

    private resetInputHeight(): void {
        this.inputElement.style.height = `${this.minimumInputHeightPx}px`;
    }
}