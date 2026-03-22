import { consola } from 'consola';
import { getConfig } from './config';

const logger = consola.withTag('security:turnstile');

export async function verifyTurnstileToken(params: {
    token: string | null | undefined;
    action: string;
}): Promise<void> {
    const turnstileEnabled = await getConfig('turnstile_enabled');
    if (turnstileEnabled !== 'true') {
        return;
    }

    const token = params.token?.trim();
    if (!token) {
        logger.warn(`Captcha required but missing for ${params.action}`);
        throw createError({ statusCode: 400, message: 'Captcha verification required' });
    }

    const secret = await getConfig('turnstile_secret_key');
    const res = await $fetch<{ success: boolean }>(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
            method: 'POST',
            body: { secret, response: token }
        }
    );

    if (!res.success) {
        logger.warn(`Captcha verification failed for ${params.action}`);
        throw createError({ statusCode: 400, message: 'Captcha verification failed' });
    }
}
