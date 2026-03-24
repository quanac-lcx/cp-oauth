import { getUserIdFromEvent } from '~/server/utils/auth';
import prisma from '~/server/utils/prisma';
import {
    build2faSetupEmailKey,
    delRedisKey,
    getRedisJson,
    verifyCodeHash
} from '~/server/utils/security';

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);
    const body = await readBody(event);
    const code = String(body?.code || '').trim();

    if (!code) {
        throw createError({ statusCode: 400, message: 'Code is required' });
    }

    const key = build2faSetupEmailKey(userId);
    const payload = await getRedisJson<{ codeHash: string; method: 'email_otp' }>(key);
    if (!payload) {
        throw createError({ statusCode: 400, message: 'No active setup request' });
    }

    const valid = await verifyCodeHash(code, payload.codeHash);
    if (!valid) {
        throw createError({ statusCode: 400, message: 'Invalid code' });
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            twoFactorEnabled: true,
            twoFactorMethod: 'email_otp'
        }
    });

    await delRedisKey(key);

    return { success: true };
});
