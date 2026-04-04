export function isOAuthGeneratedLocalEmail(email: string): boolean {
    const normalized = String(email || '')
        .trim()
        .toLowerCase();
    const atIndex = normalized.lastIndexOf('@');
    if (atIndex < 0) {
        return false;
    }
    const domain = normalized.slice(atIndex + 1);
    return domain.endsWith('.local');
}
