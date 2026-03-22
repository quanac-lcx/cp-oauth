import prisma from '~/server/utils/prisma';
import { getUserIdFromEvent } from '~/server/utils/auth';
import { USERNAME_RULE_MESSAGE, isValidUsername, normalizeUsername } from '~/utils/username';

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);

    if (event.method === 'GET') {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                bio: true,
                homepage: true,
                avatarUrl: true,
                role: true,
                emailVerified: true,
                theme: true,
                locale: true
            }
        });
        if (!user) throw createError({ statusCode: 404, message: 'User not found' });
        return user;
    }

    if (event.method === 'PATCH') {
        const body = await readBody(event);
        const { displayName, bio, homepage, avatarUrl, theme, locale } = body;

        const data: Record<string, string | boolean> = {};
        if (body.username !== undefined) {
            const username = normalizeUsername(body.username);
            if (!isValidUsername(username)) {
                throw createError({
                    statusCode: 400,
                    message: USERNAME_RULE_MESSAGE
                });
            }

            const existing = await prisma.user.findFirst({
                where: {
                    username,
                    id: { not: userId }
                },
                select: { id: true }
            });
            if (existing) {
                throw createError({ statusCode: 409, message: 'Username is already taken' });
            }

            data.username = username;
        }
        if (displayName !== undefined) data.displayName = displayName;
        if (bio !== undefined) data.bio = bio;
        if (homepage !== undefined) data.homepage = homepage;
        if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
        if (theme !== undefined) data.theme = theme;
        if (locale !== undefined) data.locale = locale;

        const user = await prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                bio: true,
                homepage: true,
                avatarUrl: true,
                role: true,
                emailVerified: true,
                theme: true,
                locale: true
            }
        });
        return user;
    }

    throw createError({ statusCode: 405, message: 'Method not allowed' });
});
