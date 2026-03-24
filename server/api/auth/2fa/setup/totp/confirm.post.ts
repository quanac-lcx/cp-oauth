import { getUserIdFromEvent } from '~/server/utils/auth';
import prisma from '~/server/utils/prisma';
import {
    build2faSetupTotpKey,
    delRedisKey,
    getRedisJson,
    verifyTotp
} from '~/server/utils/security';

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);
    const body = await readBody(event);
    const code = String(body?.code || '').trim();

    if (!code) {
        throw createError({ statusCode: 400, message: 'Code is required' });
    }

    const key = build2faSetupTotpKey(userId);
    const payload = await getRedisJson<{ secret: string; method: 'totp' }>(key);
    if (!payload) {
        throw createError({ statusCode: 400, message: 'No active setup request' });
    }

    if (!(await verifyTotp(payload.secret, code))) {
        throw createError({ statusCode: 400, message: 'Invalid code' });
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            twoFactorEnabled: true,
            twoFactorMethod: 'totp',
            totpSecret: payload.secret
        }
    });

    await delRedisKey(key);

    return { success: true };
});
