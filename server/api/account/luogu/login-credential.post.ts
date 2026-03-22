import { getUserIdFromEvent } from '~/server/utils/auth';
import prisma from '~/server/utils/prisma';
import {
    isValidLuoguLoginDuration,
    issueLuoguLoginCredential,
    type LuoguLoginDuration
} from '~/server/utils/luogu-login-credential';

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);
    const body = await readBody(event);
    const duration = String(body.duration || '');

    if (!isValidLuoguLoginDuration(duration)) {
        throw createError({ statusCode: 400, message: 'Invalid duration option' });
    }

    const linked = await prisma.linkedAccount.findUnique({
        where: {
            userId_platform: {
                userId,
                platform: 'luogu'
            }
        },
        select: {
            platformUid: true,
            platformUsername: true
        }
    });

    if (!linked) {
        throw createError({
            statusCode: 400,
            message: 'Luogu account is not linked'
        });
    }

    const result = await issueLuoguLoginCredential({
        userId,
        platformUid: linked.platformUid,
        platformUsername: linked.platformUsername,
        duration: duration as LuoguLoginDuration
    });

    return result;
});
