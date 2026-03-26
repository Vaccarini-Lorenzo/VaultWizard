import { USER_BACKGROUND_MAX_LENGTH } from "../../constants";

export function normalizeUserBackgroundInformations(rawValue: string): string {
    const normalizedLineEndings = rawValue.replace(/\r\n/g, "\n");
    const trimmedValue = normalizedLineEndings.trim();

    if (trimmedValue.length <= USER_BACKGROUDo you think that the book "The linux programming interface" might be a good read?
I started reading it and I found myself wondering if it's too C-heavy.ND_MAX_LENGTH) {
        return trimmedValue;
    }

    return trimmedValue.slice(0, USER_BACKGROUND_MAX_LENGTH);
}