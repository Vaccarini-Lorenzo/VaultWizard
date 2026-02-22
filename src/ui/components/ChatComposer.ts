export function renderChatComposer(
    container: HTMLElement,
    onSend: (value: string) => Promise<void>,
    disabled: boolean
) {
    const composer = container.createDiv({ cls: "ai-helper-composer" });
    const input = composer.createEl("textarea", {
        cls: "ai-helper-input",
        attr: { placeholder: 'Type message (/c for current note content)...' }
    });

    const send = composer.createEl("button", {
        cls: "ai-helper-send-btn",
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