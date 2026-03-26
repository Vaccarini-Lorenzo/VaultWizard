import { USER_BACKGROUND_MAX_LENGTH } from "../../constants";

export function normalizeUserBackgroundInformations(rawValue: string): string {
    const normalizedLineEndings = rawValue.replace(/\r\n/g, "\n");
    const trimmedValue = normalizedLineEndings.trim();

    if (trimmedValue.length <= USER_BACKGROUND_MAX_LENGTH) {
        return trimmedValue;
    }

    return trimmedValue.slice(0, USER_BACKGROUND_MAX_LENGTH);
}