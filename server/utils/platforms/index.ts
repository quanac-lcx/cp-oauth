import type { PlatformVerifier } from './types';

import { luoguVerifier } from './luogu';

const verifiers = new Map<string, PlatformVerifier>([['luogu', luoguVerifier]]);

export function getPlatformVerifier(platform: string): PlatformVerifier | undefined {
    return verifiers.get(platform);
}

export function getAllPlatforms(): { platform: string; displayName: string }[] {
    return Array.from(verifiers.values()).map(v => ({
        platform: v.platform,
        displayName: v.displayName
    }));
}
