import bcrypt from 'bcryptjs';
import { getUserIdFromEvent } from '~/server/utils/auth';
import prisma from '~/server/utils/prisma';

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);
    const body = await readBody(event);
    const password = String(body?.password || '');

    if (!password) {
        throw createError({ statusCode: 400, message: 'Password is required' });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            passwordHash: true
        }
    });

    if (!user) {
        throw createError({ statusCode: 404, message: 'User not found' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        throw createError({ statusCode: 401, message: 'Password is incorrect' });
    }

    await prisma.user.update({
        where: { id: userId },
        data: {
            twoFactorEnabled: false,
            twoFactorMethod: null,
            totpSecret: null
        }
    });

    return { success: true };
});
