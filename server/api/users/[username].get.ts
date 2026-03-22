import prisma from '~/server/utils/prisma';

export default defineEventHandler(async event => {
    const username = getRouterParam(event, 'username');
    if (!username) {
        throw createError({ statusCode: 400, message: 'Username required' });
    }

    const user = await prisma.user.findUnique({
        where: { username },
        select: {
            id: true,
            username: true,
            displayName: true,
            bio: true,
            homepage: true,
            avatarUrl: true,
            createdAt: true,
            linkedAccounts: {
                select: {
                    platform: true,
                    platformUid: true,
                    platformUsername: true
                },
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!user) {
        throw createError({ statusCode: 404, message: 'User not found' });
    }

    return user;
});
