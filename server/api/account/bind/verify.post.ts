import { getUserIdFromEvent } from '~/server/utils/auth';
import { getPlatformVerifier } from '~/server/utils/platforms';
import { getRedis } from '~/server/utils/redis';
import prisma from '~/server/utils/prisma';

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);
    const body = await readBody(event);
    const { platform, credential } = body;

    if (!platform || !credential) {
        throw createError({ statusCode: 400, message: 'Platform and credential are required' });
    }

    const verifier = getPlatformVerifier(platform);
    if (!verifier) {
        throw createError({ statusCode: 400, message: `Unsupported platform: ${platform}` });
    }

    // Retrieve pending bind request from Redis
    const redis = getRedis();
    const key = `bind:${userId}:${platform}`;
    const raw = await redis.get(key);
    if (!raw) {
        throw createError({
            statusCode: 400,
            message: 'No pending bind request found or it has expired'
        });
    }

    const { code, platformUid } = JSON.parse(raw) as {
        code: string;
        platformUid: string;
    };

    // Call platform verifier
    const result = await verifier.verify({ platformUid, code, credential });

    if (!result.success) {
        throw createError({
            statusCode: 400,
            message: result.error || 'Verification failed'
        });
    }

    // Save to database
    const linked = await prisma.linkedAccount.create({
        data: {
            userId,
            platform,
            platformUid: result.platformUid,
            platformUsername: result.platformUsername || null
        }
    });

    // Clean up Redis
    await redis.del(key);

    return {
        id: linked.id,
        platform: linked.platform,
        platformUid: linked.platformUid,
        platformUsername: linked.platformUsername
    };
});
