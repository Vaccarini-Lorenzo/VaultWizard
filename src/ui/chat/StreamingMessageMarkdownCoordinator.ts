export class StreamingMessageMarkdownCoordinator {
    private scheduledAnimationFrameId: number | null = null;
    private scheduledTimeoutId: number | null = null;
    private pendingTargetElement: HTMLElement | null = null;
    private pendingMarkdownContent: string | null = null;
    private lastRenderTimestampMs = 0;
    private isRenderInProgress = false;

    constructor(
        private readonly renderMarkdown: (
            targetElement: HTMLElement,
            markdownContent: string
        ) => Promise<void> | void,
        private readonly minimumRenderIntervalMs = 120
    ) {}

    schedule(targetElement: HTMLElement, markdownContent: string): void {
        this.pendingTargetElement = targetElement;
        this.pendingMarkdownContent = markdownContent;
        this.scheduleRenderAtNextAllowedSlot();
    }

    flushPendingRender(): void {
        if (!this.pendingTargetElement || this.pendingMarkdownContent === null) return;
        this.cancelScheduledWork();
        void this.performRender();
    }

    reset(): void {
        this.cancelScheduledWork();
        this.pendingTargetElement = null;
        this.pendingMarkdownContent = null;
        this.isRenderInProgress = false;
        this.lastRenderTimestampMs = 0;
    }

    private scheduleRenderAtNextAllowedSlot(): void {
        if (this.isRenderInProgress) return;
        if (this.scheduledAnimationFrameId !== null || this.scheduledTimeoutId !== null) return;

        const elapsedSinceLastRenderMs = performance.now() - this.lastRenderTimestampMs;
        const canRenderNow = elapsedSinceLastRenderMs >= this.minimumRenderIntervalMs;

        if (canRenderNow) {
            this.scheduledAnimationFrameId = requestAnimationFrame(() => {
                this.scheduledAnimationFrameId = null;
                void this.performRender();
            });
            return;
        }

        const waitTimeMs = this.minimumRenderIntervalMs - elapsedSinceLastRenderMs;
        this.scheduledTimeoutId = window.setTimeout(() => {
            this.scheduledTimeoutId = null;
            this.scheduleRenderAtNextAllowedSlot();
        }, waitTimeMs);
    }

    private async performRender(): Promise<void> {
        if (this.isRenderInProgress) return;
        if (!this.pendingTargetElement || this.pendingMarkdownContent === null) return;

        const targetElementToRender = this.pendingTargetElement;
        const markdownContentToRender = this.pendingMarkdownContent;

        if (!targetElementToRender.isConnected) {
            this.pendingTargetElement = null;
            this.pendingMarkdownContent = null;
            return;
        }

        this.isRenderInProgress = true;

        try {
            await this.renderMarkdown(targetElementToRender, markdownContentToRender);
            this.lastRenderTimestampMs = performance.now();
        } finally {
            this.isRenderInProgress = false;

            const didPendingContentChangeDuringRender =
                this.pendingTargetElement !== targetElementToRender ||
                this.pendingMarkdownContent !== markdownContentToRender;

            if (didPendingContentChangeDuringRender) {
                this.scheduleRenderAtNextAllowedSlot();
            } else {
                this.pendingTargetElement = null;
                this.pendingMarkdownContent = null;
            }
        }
    }

    private cancelScheduledWork(): void {
        if (this.scheduledAnimationFrameId !== null) {
            cancelAnimationFrame(this.scheduledAnimationFrameId);
            this.scheduledAnimationFrameId = null;
        }

        if (this.scheduledTimeoutId !== null) {
            clearTimeout(this.scheduledTimeoutId);
            this.scheduledTimeoutId = null;
        }
    }
}