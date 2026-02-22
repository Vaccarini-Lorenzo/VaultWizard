export function renderChatComposer(
    container: HTMLElement,
    onSend: (value: string) => Promise<void>,
    disabled: boolean
) {
    const composer = container.createDiv({ cls: "vault-wizard-composer" });
    const input = composer.createEl("textarea", {
        cls: "vault-wizard-input",
        attr: { placeholder: 'Type message (/c for current note content)...' }
    });

    const send = composer.createEl("button", {
        cls: "vault-wizard-send-btn",
        text: disabled ? "..." : "Send"
    });
    send.disabled = disabled;

    const submit = async () => {
        const value = input.value;
        input.value = "";
        await onSend(value);
    };

    send.addEventListener("click", submit);
    input.addEventListener("keydown", async (ev) => {
        if (ev.key === "Enter" && !ev.shiftKey) {
            ev.preventDefault();
            await submit();
        }
    });
}