import { consola } from 'consola';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '~/server/utils/prisma';
import { getConfig } from '~/server/utils/config';

const logger = consola.withTag('auth:login');

export default defineEventHandler(async event => {
    const body = await readBody(event);
    const { email, password, turnstileToken } = body;

    if (!email || !password) {
        throw createError({ statusCode: 400, message: 'Email and password are required' });
    }

    // Turnstile verification
    const turnstileEnabled = await getConfig('turnstile_enabled');
    if (turnstileEnabled === 'true') {
        const secret = await getConfig('turnstile_secret_key');
        if (!turnstileToken) {
            logger.warn(`Login rejected: captcha required but not provided for ${email}`);
            throw createError({ statusCode: 400, message: 'Captcha verification required' });
        }
        const res = await $fetch<{ success: boolean }>(
            'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            { method: 'POST', body: { secret, response: turnstileToken } }
        );
        if (!res.success) {
            logger.warn(`Login rejected: captcha verification failed for ${email}`);
            throw createError({ statusCode: 400, message: 'Captcha verification failed' });
        }
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        logger.warn(`Login failed: unknown email ${email}`);
        throw createError({ statusCode: 401, message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
        logger.warn(`Login failed: wrong password for ${email} (user=${user.id})`);
        throw createError({ statusCode: 401, message: 'Invalid credentials' });
    }

    const config = useRuntimeConfig();
    const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '7d' });

    logger.success(`Login successful: ${user.username} (${user.id})`);

    return { token, user: { id: user.id, username: user.username, email: user.email } };
});
