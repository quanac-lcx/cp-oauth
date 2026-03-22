export function buildLoginPath(redirectTo: string): string {
    return `/login?redirect=${encodeURIComponent(redirectTo)}`;
}

export function getSafeRedirectTarget(
    redirect: string | null | Array<string | null> | undefined,
    fallback = '/'
): string {
    const raw = Array.isArray(redirect) ? redirect[0] : redirect;
    const target = String(raw || '').trim();

    if (!target.startsWith('/')) return fallback;
    if (target.startsWith('//')) return fallback;

    return target || fallback;
}
