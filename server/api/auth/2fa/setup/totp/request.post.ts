import QRCode from 'qrcode';
import { getUserIdFromEvent } from '~/server/utils/auth';
import prisma from '~/server/utils/prisma';
import {
    build2faSetupTotpKey,
    buildTotpOtpauthUrl,
    generateTotpSecret,
    setRedisJson
} from '~/server/utils/security';

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
    });
    if (!user?.email) {
        throw createError({ statusCode: 400, message: 'Email is required before enabling TOTP' });
    }

    const secret = generateTotpSecret();
    const otpauth = buildTotpOtpauthUrl(user.email, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    await setRedisJson(
        build2faSetupTotpKey(userId),
        {
            secret,
            method: 'totp'
        },
        900
    );

    return {
        secret,
        otpauth,
        qrCodeDataUrl
    };
});
