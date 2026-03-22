import type { PlatformVerifier, VerifyResult } from './types';

const LUOGU_USER_AGENT = 'Mozilla/5.0 (compatible; CPOAuth/1.0)';

interface LuoguPasteResponse {
    code: number;
    currentData: {
        paste: {
            data: string;
            id: string;
            public: boolean;
            user: {
                uid: number;
                name: string;
            };
        };
    };
}

export const luoguVerifier: PlatformVerifier = {
    platform: 'luogu',
    displayName: '洛谷',

    async verify({ platformUid, code, credential }): Promise<VerifyResult> {
        const pasteId = credential.trim();
        if (!pasteId) {
            return { success: false, platformUid, error: 'Paste ID is required' };
        }

        try {
            const res = await $fetch<LuoguPasteResponse>(
                `https://www.luogu.com.cn/paste/${pasteId}`,
                {
                    headers: {
                        'user-agent': LUOGU_USER_AGENT,
                        'x-luogu-type': 'content-only'
                    }
                }
            );

            const paste = res.currentData?.paste;
            if (!paste) {
                return { success: false, platformUid, error: 'Paste not found' };
            }

            if (!paste.public) {
                return { success: false, platformUid, error: 'Paste is not public' };
            }

            const pasteOwnerUid = String(paste.user.uid);
            if (pasteOwnerUid !== String(platformUid)) {
                return {
                    success: false,
                    platformUid,
                    error: 'Paste owner does not match the claimed UID'
                };
            }

            if (!paste.data.includes(code)) {
                return {
                    success: false,
                    platformUid,
                    error: 'Verification code not found in paste'
                };
            }

            return {
                success: true,
                platformUid: pasteOwnerUid,
                platformUsername: paste.user.name
            };
        } catch (e: unknown) {
            const err = e as { statusCode?: number; data?: unknown };
            if (err.statusCode === 404) {
                return { success: false, platformUid, error: 'Paste not found' };
            }
            return {
                success: false,
                platformUid,
                error: 'Failed to fetch paste from Luogu'
            };
        }
    }
};
