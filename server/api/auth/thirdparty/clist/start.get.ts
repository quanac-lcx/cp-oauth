import crypto from 'crypto';
import { consola } from 'consola';
import { getUserIdFromEvent } from '~/server/utils/auth';
import { getConfig } from '~/server/utils/config';
import prisma from '~/server/utils/prisma';
import { getRedis } from '~/server/utils/redis';
import {
    buildClistAuthorizationUrl,
    generateCodeChallenge,
    generateCodeVerifier
} from '~/server/utils/clist-oauth';
import { verifyTurnstileToken } from '~/server/utils/turnstile';

const logger = consola.withTag('auth:clist:start');
const STATE_TTL_SECONDS = 10 * 60;
type ClistOAuthMode = 'login' | 'bind' | 'register';

function parseMode(value: unknown): ClistOAuthMode {
    if (value === 'bind') {
        return 'bind';
    }
    if (value === 'register') {
        return 'register';
    }
    return 'login';
}

function getSafeInternalRedirect(value: unknown): string {
    if (typeof value !== 'string') {
        return '/';
    }
    const target = value.trim();
    if (!target.startsWith('/') || target.startsWith('//')) {
        return '/';
    }
    return target;
}

export default defineEventHandler(async event => {
    const query = getQuery(event);
    const mode = parseMode(query.mode);
    const clientId = (await getConfig('clist_client_id')).trim();
    if (!clientId) {
        throw createError({
            statusCode: 503,
            message: 'Clist login is not configured'
        });
    }

    const state = crypto.randomBytes(24).toString('hex');
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const redirectAfterLogin = getSafeInternalRedirect(query.redirect);
    const redirectUri = `${getRequestURL(event).origin}/oauth/thirdparty/clist`;
    const bindUserId = mode === 'bind' ? getUserIdFromEvent(event) : null;

    if (mode === 'register') {
        const turnstileToken = typeof query.turnstileToken === 'string' ? query.turnstileToken : '';
        await verifyTurnstileToken({
            token: turnstileToken,
            action: `clist:${mode}:start`
        });
    }

    if (mode === 'bind' && bindUserId) {
        const existing = await prisma.linkedAccount.findUnique({
            where: {
                userId_platform: {
                    userId: bindUserId,
                    platform: 'clist'
                }
            },
            select: { id: true }
        });
        if (existing) {
            throw createError({
                statusCode: 409,
                message: 'You have already linked a Clist account'
            });
        }
    }

    const authUrl = buildClistAuthorizationUrl({
        clientId,
        redirectUri,
        state,
        codeChallenge
    });

    await getRedis().set(
        `oauth:clist:state:${state}`,
        JSON.stringify({
            mode,
            bindUserId,
            redirectAfterLogin,
            codeVerifier,
            createdAt: Date.now()
        }),
        'EX',
        STATE_TTL_SECONDS
    );

    logger.info(`Generated Clist OAuth state, mode=${mode}, redirect=${redirectAfterLogin}`);

    return {
        authorizationUrl: authUrl
    };
});
