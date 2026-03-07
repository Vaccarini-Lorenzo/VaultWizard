import { App, Component, MarkdownRenderer } from "obsidian";

export interface ChatMessageRenderingContext {
    app: App;
    component: Component;
    sourcePath: string;
}

export class ChatMessageRenderer {
    constructor(private readonly renderingContext: ChatMessageRenderingContext) {}

    async renderMarkdown(targetElement: HTMLElement, markdownContent: string): Promise<void> {
        targetElement.empty();

        await MarkdownRenderer.render(
            this.renderingContext.app,
            markdownContent,
            targetElement,
            this.renderingContext.sourcePath,
            this.renderingContext.component
        );
    }
}