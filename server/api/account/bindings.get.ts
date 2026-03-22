import { getUserIdFromEvent } from '~/server/utils/auth';
import prisma from '~/server/utils/prisma';

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);

    const accounts = await prisma.linkedAccount.findMany({
        where: { userId },
        select: {
            id: true,
            platform: true,
            platformUid: true,
            platformUsername: true,
            verifiedAt: true
        },
        orderBy: { createdAt: 'asc' }
    });

    return accounts;
});
