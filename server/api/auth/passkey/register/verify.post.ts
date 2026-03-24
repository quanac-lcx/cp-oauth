import prisma from '~/server/utils/prisma';
import { getUserIdFromEvent } from '~/server/utils/auth';
import { getPasskeyRpInfo, verifyRegistration } from '~/server/utils/passkey';
import {
    buildPasskeyRegisterChallengeKey,
    delRedisKey,
    getRedisJson
} from '~/server/utils/security';

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);
    const body = await readBody(event);
    type RegistrationResponseType = Parameters<typeof verifyRegistration>[0]['response'];
    const response = body?.response as RegistrationResponseType | undefined;
    const name = String(body?.name || '').trim() || 'My Passkey';

    if (!response) {
        throw createError({ statusCode: 400, message: 'Registration response is required' });
    }

    const key = buildPasskeyRegisterChallengeKey(userId);
    const payload = await getRedisJson<{ challenge: string }>(key);
    if (!payload) {
        throw createError({
            statusCode: 400,
            message: 'Passkey registration challenge is missing'
        });
    }

    const verification = await verifyRegistration({
        response,
        expectedChallenge: payload.challenge,
        rpInfo: getPasskeyRpInfo(event)
    });

    if (!verification.verified || !verification.registrationInfo) {
        throw createError({ statusCode: 400, message: 'Passkey registration verification failed' });
    }

    const credential = verification.registrationInfo.credential;
    const responseTransports =
        (response as { response?: { transports?: string[] } }).response?.transports || [];
    await prisma.passkeyCredential.create({
        data: {
            userId,
            name,
            credentialId: credential.id,
            publicKey: Buffer.from(credential.publicKey).toString('base64'),
            counter: credential.counter,
            transports: responseTransports
        }
    });

    await delRedisKey(key);

    return { success: true };
});
