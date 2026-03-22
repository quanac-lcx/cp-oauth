import crypto from 'crypto';
import prisma from '~/server/utils/prisma';
import { getRedis } from '~/server/utils/redis';
import { verifyTurnstileToken } from '~/server/utils/turnstile';

export default defineEventHandler(async event => {
    const body = await readBody(event);
    const platformUid = String(body.platformUid || '').trim();
    const turnstileToken = String(body.turnstileToken || '');

    await verifyTurnstileToken({
        token: turnstileToken,
        action: 'luogu:challenge:request'
    });

    if (!platformUid) {
        throw createError({ statusCode: 400, message: 'Platform UID is required' });
    }

    const linked = await prisma.linkedAccount.findUnique({
        where: {
            platform_platformUid: {
                platform: 'luogu',
                platformUid
            }
        },
        select: {
            userId: true
        }
    });

    if (!linked) {
        throw createError({
            statusCode: 404,
            message: 'This Luogu account has not been linked'
        });
    }

    const requestId = crypto.randomBytes(12).toString('hex');
    const code = `CPOAUTH-CHALLENGE-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    await getRedis().set(
        `auth:luogu:challenge:${requestId}`,
        JSON.stringify({ code, platformUid }),
        'EX',
        600
    );

    return {
        requestId,
        code,
        expiresIn: 600
    };
});
