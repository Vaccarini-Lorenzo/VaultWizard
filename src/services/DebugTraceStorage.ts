import { DebugTurnTrace } from "../models/DebugTurnTrace";
import { TokenUsage } from "../models/TokenUsage";

class DebugTraceStorage {
    private traces: DebugTurnTrace[] = [];
    private conversationId = "";

    clear(conversationId: string): void {
        this.traces = [];
        this.conversationId = conversationId;
    }

    appendTrace(trace: DebugTurnTrace): void {
        this.traces.push(trace);
    }

    getTraces(): readonly DebugTurnTrace[] {
        return this.traces;
    }

    getAggregateTokenUsage(): TokenUsage {
        return this.traces.reduce<TokenUsage>(
            (aggregateUsage, currentTrace) => {
                if (!currentTrace.tokenUsage) return aggregateUsage;

                return {
                    inputTokens: aggregateUsage.inputTokens + currentTrace.tokenUsage.inputTokens,
                    outputTokens: aggregateUsage.outputTokens + currentTrace.tokenUsage.outputTokens,
                    cachedInputTokens: aggregateUsage.cachedInputTokens + currentTrace.tokenUsage.cachedInputTokens
                };
            },
            { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 }
        );
    }
}

export const debugTraceStorage = new DebugTraceStorage();