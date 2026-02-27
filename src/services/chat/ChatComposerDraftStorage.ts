import { CHAT_COMPOSER_DRAFT_STORAGE_KEY } from "../../constants";

function isLocalStorageAvailable(): boolean {
    try {
        return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
    } catch {
        return false;
    }
}


class ChatComposerDraftStorage {
    private lastUpdateTimestamp: number;
    private minimumIntervalBetweenSavesMs = 1000;
    private cachedDraft: string = "";
    private maxIgnoredChars = 10;

    constructor() {
        this.lastUpdateTimestamp = Date.now();
    }

    loadText(): string {
        if (!isLocalStorageAvailable()) return "";

        try {
            this.cachedDraft = window.localStorage.getItem(CHAT_COMPOSER_DRAFT_STORAGE_KEY) ?? "";
            return this.cachedDraft;
        } catch {
            return "";
        }
    }

    saveDraft(draftText: string): void {
        if (!isLocalStorageAvailable()) return;
        const now = Date.now();
        if ((Math.abs(draftText.length - this.cachedDraft.length) < this.maxIgnoredChars) && (now - this.lastUpdateTimestamp < this.minimumIntervalBetweenSavesMs)){
            return
        }
        try {
            window.localStorage.setItem(CHAT_COMPOSER_DRAFT_STORAGE_KEY, draftText);
            this.cachedDraft = draftText;
            this.lastUpdateTimestamp = now;
        } catch {
            console.error("Failed to save chat composer draft to localStorage.");
        }
    }

    clearDraft(): void {
        if (!isLocalStorageAvailable()) return;

        try {
            window.localStorage.removeItem(CHAT_COMPOSER_DRAFT_STORAGE_KEY);
        } catch {
            console.error("Failed to clear chat composer draft from localStorage.");
        }
    }

}

export const chatComposerDraftStorage = new ChatComposerDraftStorage();