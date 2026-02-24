import { DebugTurnTrace } from "../../models/debug/DebugTurnTrace";
import { TokenUsage } from "../../models/llm/TokenUsage";

class DebugTraceStorage {
    private traces: DebugTurnTrace[] = [];
    private chatId = "";

    clear(chatId: string): void {
        this.traces = [];
        this.chatId = chatId;
    }

    getchatId(): string {
        return this.chatId;
    }

    replaceTraces(chatId: string, debugTraces: readonly DebugTurnTrace[]): void {
        this.chatId = chatId;
        this.traces = debugTraces.map((debugTrace) => ({ ...debugTrace }));
    }

    appendTrace(debugTrace: DebugTurnTrace): void {
        this.traces.push(debugTrace);
    }

    getTraces(): readonly DebugTurnTrace[] {
        return this.traces;
    }

    getAggregateTokenUsage(): TokenUsage {
        return this.traces.reduce<TokenUsage>(
            (aggregatedUsage, trace) => {
                const tokenUsage = trace.tokenUsage;
                if (!tokenUsage) return aggregatedUsage;

                return {
                    inputTokens: aggregatedUsage.inputTokens + tokenUsage.inputTokens,
                    outputTokens: aggregatedUsage.outputTokens + tokenUsage.outputTokens,
                    cachedInputTokens: aggregatedUsage.cachedInputTokens + tokenUsage.cachedInputTokens
                };
            },
            { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 }
        );
    }
}

export const debugTraceStorage = new DebugTraceStorage();