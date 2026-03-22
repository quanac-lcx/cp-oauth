export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const USERNAME_REGEX = /^[A-Za-z0-9_]{3,24}$/;

export const USERNAME_RULE_MESSAGE =
    'Username must be 3-24 characters and contain only letters, numbers, and underscores';

export function normalizeUsername(value: unknown): string {
    return String(value ?? '').trim();
}

export function isValidUsername(value: string): boolean {
    return USERNAME_REGEX.test(value);
}
