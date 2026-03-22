import { consola } from 'consola';
import crypto from 'crypto';
import { getUserIdFromEvent } from '~/server/utils/auth';
import { getPlatformVerifier } from '~/server/utils/platforms';
import { getRedis } from '~/server/utils/redis';
import prisma from '~/server/utils/prisma';

const logger = consola.withTag('account:bind');

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);
    const body = await readBody(event);
    const { platform, platformUid } = body;

    if (!platform || !platformUid) {
        throw createError({ statusCode: 400, message: 'Platform and platformUid are required' });
    }

    const verifier = getPlatformVerifier(platform);
    if (!verifier) {
        logger.warn(`Unsupported platform "${platform}" requested by user ${userId}`);
        throw createError({ statusCode: 400, message: `Unsupported platform: ${platform}` });
    }

    // Check if already bound to this platform
    const existing = await prisma.linkedAccount.findUnique({
        where: { userId_platform: { userId, platform } }
    });
    if (existing) {
        throw createError({
            statusCode: 409,
            message: 'You have already linked an account for this platform'
        });
    }

    // Check if this platform UID is already bound by another user
    const taken = await prisma.linkedAccount.findUnique({
        where: { platform_platformUid: { platform, platformUid: String(platformUid) } }
    });
    if (taken) {
        logger.warn(
            `Platform UID ${platformUid}@${platform} already taken, requested by user ${userId}`
        );
        throw createError({
            statusCode: 409,
            message: 'This platform account is already linked by another user'
        });
    }

    // Generate verification code
    const code = `CPOAUTH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Store in Redis with 10-minute TTL
    const redis = getRedis();
    const key = `bind:${userId}:${platform}`;
    await redis.set(key, JSON.stringify({ code, platformUid: String(platformUid) }), 'EX', 600);

    logger.info(`Bind request created: user=${userId}, platform=${platform}, uid=${platformUid}`);

    return { code, expiresIn: 600 };
});
