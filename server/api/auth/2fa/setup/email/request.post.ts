import { getUserIdFromEvent } from '~/server/utils/auth';
import prisma from '~/server/utils/prisma';
import { sendTwoFactorEmailCode } from '~/server/utils/mailer';
import {
    build2faSetupEmailKey,
    generateSixDigitCode,
    hashCode,
    setRedisJson
} from '~/server/utils/security';

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
    });
    if (!user?.email) {
        throw createError({
            statusCode: 400,
            message: 'Email is required before enabling email OTP'
        });
    }

    const code = generateSixDigitCode();
    const sent = await sendTwoFactorEmailCode(user.email, code);
    if (!sent) {
        throw createError({ statusCode: 503, message: 'SMTP is not configured' });
    }

    await setRedisJson(
        build2faSetupEmailKey(userId),
        {
            codeHash: await hashCode(code),
            method: 'email_otp'
        },
        600
    );

    return { success: true };
});
