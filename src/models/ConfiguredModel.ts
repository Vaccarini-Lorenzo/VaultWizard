import { AiProvider } from "./AiProvider";

export interface ConfiguredModel {
    id: string;
    provider: AiProvider;
    modelName: string;
    settings: Record<string, string>;
    createdAt: number;
}

export interface NewConfiguredModelInput {
    provider: AiProvider;
    modelName: string;
    settings: Record<string, string>;
}