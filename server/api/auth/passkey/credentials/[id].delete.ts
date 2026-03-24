import prisma from '~/server/utils/prisma';
import { getUserIdFromEvent } from '~/server/utils/auth';

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);
    const id = getRouterParam(event, 'id');

    if (!id) {
        throw createError({ statusCode: 400, message: 'Passkey id is required' });
    }

    const target = await prisma.passkeyCredential.findFirst({
        where: {
            id,
            userId
        },
        select: { id: true }
    });
    if (!target) {
        throw createError({ statusCode: 404, message: 'Passkey not found' });
    }

    await prisma.passkeyCredential.delete({ where: { id } });
    return { success: true };
});
