export const LUOGU_LOGIN_DURATION_OPTIONS = [
    '1day',
    '3day',
    '7day',
    '14day',
    '1month',
    '2month',
    '3month'
] as const;

export type LuoguLoginDuration = (typeof LUOGU_LOGIN_DURATION_OPTIONS)[number];

export const LUOGU_LOGIN_DURATION_SECONDS: Record<LuoguLoginDuration, number> = {
    '1day': 24 * 60 * 60,
    '3day': 3 * 24 * 60 * 60,
    '7day': 7 * 24 * 60 * 60,
    '14day': 14 * 24 * 60 * 60,
    '1month': 30 * 24 * 60 * 60,
    '2month': 60 * 24 * 60 * 60,
    '3month': 90 * 24 * 60 * 60
};

export function isValidLuoguLoginDuration(value: string): value is LuoguLoginDuration {
    return LUOGU_LOGIN_DURATION_OPTIONS.includes(value as LuoguLoginDuration);
}
