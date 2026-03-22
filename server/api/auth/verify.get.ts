import { consola } from 'consola';
import prisma from '~/server/utils/prisma';

const logger = consola.withTag('auth:verify');

export default defineEventHandler(async event => {
    const query = getQuery(event);
    const token = query.token as string;

    if (!token) {
        throw createError({ statusCode: 400, message: 'Verification token required' });
    }

    const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });
    if (!user) {
        logger.warn('Email verification failed: invalid or expired token');
        throw createError({ statusCode: 400, message: 'Invalid or expired verification token' });
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, emailVerifyToken: null }
    });

    logger.success(`Email verified: ${user.username} (${user.id})`);

    return sendRedirect(event, '/login?verified=true');
});
