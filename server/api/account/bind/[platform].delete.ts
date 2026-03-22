import { getUserIdFromEvent } from '~/server/utils/auth';
import prisma from '~/server/utils/prisma';

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);
    const platform = getRouterParam(event, 'platform');

    if (!platform) {
        throw createError({ statusCode: 400, message: 'Platform is required' });
    }

    const existing = await prisma.linkedAccount.findUnique({
        where: { userId_platform: { userId, platform } }
    });

    if (!existing) {
        throw createError({
            statusCode: 404,
            message: 'No linked account found for this platform'
        });
    }

    await prisma.linkedAccount.delete({
        where: { id: existing.id }
    });

    return { success: true };
});
