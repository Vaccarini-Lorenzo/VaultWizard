export function renderChatComposer(
    container: HTMLElement,
    onSend: (value: string) => Promise<void>,
    disabled: boolean,
    onComposerInteraction?: () => void
) {
    const composer = container.createDiv({ cls: "vault-wizard-composer" });
    const input = composer.createEl("textarea", {
        cls: "vault-wizard-input",
        attr: { placeholder: "Type message (/c for current note content)..." }
    });

    const send = composer.createEl("button", {
        cls: "vault-wizard-send-btn",
        text: disabled ? "..." : "Send"
    });
    send.disabled = disabled;

    const notifyComposerInteraction = () => {
        onComposerInteraction?.();
    };

    const submit = async () => {
        const value = input.value;
        input.value = "";
        await onSend(value);
    };

    composer.addEventListener("mousedown", notifyComposerInteraction);
    input.addEventListener("focus", notifyComposerInteraction);

    send.addEventListener("click", submit);
    input.addEventListener("keydown", async (keyboardEvent) => {
        if (keyboardEvent.key === "Enter" && !keyboardEvent.shiftKey) {
            keyboardEvent.preventDefault();
            await submit();
        }
    });
}