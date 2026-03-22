import { consola } from 'consola';
import type { PlatformVerifier, VerifyResult } from './types';

const logger = consola.withTag('platform:luogu');
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

        logger.info(`Verifying paste ${pasteId} for uid=${platformUid}`);

        try {
            const res = await $fetch<LuoguPasteResponse>(`https://www.luogu.com/paste/${pasteId}`, {
                headers: {
                    'user-agent': LUOGU_USER_AGENT,
                    'x-luogu-type': 'content-only'
                }
            });

            const paste = res.currentData?.paste;
            if (!paste) {
                logger.warn(`Paste ${pasteId} not found`);
                return { success: false, platformUid, error: 'Paste not found' };
            }

            if (!paste.public) {
                logger.warn(`Paste ${pasteId} is not public`);
                return { success: false, platformUid, error: 'Paste is not public' };
            }

            const pasteOwnerUid = String(paste.user.uid);
            if (pasteOwnerUid !== String(platformUid)) {
                logger.warn(
                    `Paste owner mismatch: expected uid=${platformUid}, got uid=${pasteOwnerUid}`
                );
                return {
                    success: false,
                    platformUid,
                    error: 'Paste owner does not match the claimed UID'
                };
            }

            if (!paste.data.includes(code)) {
                logger.warn(`Verification code not found in paste ${pasteId}`);
                return {
                    success: false,
                    platformUid,
                    error: 'Verification code not found in paste'
                };
            }

            logger.success(`Verified: uid=${pasteOwnerUid}, username=${paste.user.name}`);
            return {
                success: true,
                platformUid: pasteOwnerUid,
                platformUsername: paste.user.name
            };
        } catch (e: unknown) {
            const err = e as { statusCode?: number; data?: unknown };
            if (err.statusCode === 404) {
                logger.warn(`Paste ${pasteId} not found (404)`);
                return { success: false, platformUid, error: 'Paste not found' };
            }
            logger.error(`Failed to fetch paste ${pasteId}:`, e);
            return {
                success: false,
                platformUid,
                error: 'Failed to fetch paste from Luogu'
            };
        }
    }
};
