import prisma from '~/server/utils/prisma';
import { getUserIdFromEvent } from '~/server/utils/auth';

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);

    const items = await prisma.passkeyCredential.findMany({
        where: { userId },
        select: {
            id: true,
            name: true,
            createdAt: true
        },
        orderBy: { createdAt: 'asc' }
    });

    return items;
});
