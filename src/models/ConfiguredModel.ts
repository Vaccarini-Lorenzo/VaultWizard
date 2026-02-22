import { AiProvider } from "./AiProvider";

export interface ConfiguredModel {
    provider: AiProvider;
    modelName: string;
}