import prisma from '~/server/utils/prisma';
import { getUserIdFromEvent } from '~/server/utils/auth';
import { buildRegistrationOptions, getPasskeyRpInfo } from '~/server/utils/passkey';
import { buildPasskeyRegisterChallengeKey, setRedisJson } from '~/server/utils/security';

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            displayName: true,
            passkeyCredentials: {
                select: {
                    credentialId: true
                }
            }
        }
    });

    if (!user) {
        throw createError({ statusCode: 404, message: 'User not found' });
    }

    const options = await buildRegistrationOptions({
        rpInfo: getPasskeyRpInfo(event),
        userId: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        existingCredentialIds: user.passkeyCredentials.map(item => item.credentialId)
    });

    await setRedisJson(
        buildPasskeyRegisterChallengeKey(userId),
        {
            challenge: options.challenge
        },
        300
    );

    return options;
});
