import { App, Component, MarkdownRenderer } from "obsidian";

export interface ChatMessageRenderingContext {
    app: App;
    component: Component;
    sourcePath: string;
}

export class ChatMessageRenderer {
    constructor(private readonly renderingContext: ChatMessageRenderingContext) {}

    renderMarkdown(targetElement: HTMLElement, markdownContent: string): void {
        targetElement.empty();

        void MarkdownRenderer.render(
            this.renderingContext.app,
            markdownContent,
            targetElement,
            this.renderingContext.sourcePath,
            this.renderingContext.component
        );
    }
}