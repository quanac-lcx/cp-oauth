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
            publicLinkedPlatforms: true,
            publicLinkedPlatformsConfigured: true,
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

    const linkedAccounts = user.publicLinkedPlatformsConfigured
        ? user.linkedAccounts.filter(account => {
              return user.publicLinkedPlatforms.includes(account.platform);
          })
        : user.linkedAccounts;

    return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        homepage: user.homepage,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        linkedAccounts
    };
});
