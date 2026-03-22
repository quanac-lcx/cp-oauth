import { consola } from 'consola';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '~/server/utils/prisma';
import { verifyPKCE } from '~/server/utils/oauth';

const logger = consola.withTag('oauth:token');

export default defineEventHandler(async event => {
    const body = await readBody(event);
    const {
        grant_type: grantType,
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: codeVerifier
    } = body;

    logger.info(
        `Token request: client_id=${clientId}, grant_type=${grantType}, pkce=${!!codeVerifier}`
    );

    if (grantType !== 'authorization_code') {
        logger.warn(`Rejected: unsupported grant_type="${grantType}" from client_id=${clientId}`);
        throw createError({
            statusCode: 400,
            message: 'Unsupported grant_type. Use "authorization_code".'
        });
    }

    if (!code || !redirectUri || !clientId) {
        logger.warn('Rejected: missing required parameters in token request');
        throw createError({
            statusCode: 400,
            message: 'Missing required parameters: code, redirect_uri, client_id'
        });
    }

    const authCode = await prisma.oAuthAuthorizationCode.findUnique({ where: { code } });
    if (!authCode) {
        logger.warn(`Rejected: invalid authorization code from client_id=${clientId}`);
        throw createError({ statusCode: 400, message: 'Invalid authorization code' });
    }

    if (authCode.used) {
        logger.warn(
            `Rejected: code reuse attempt from client_id=${clientId}, user=${authCode.userId}`
        );
        throw createError({ statusCode: 400, message: 'Authorization code already used' });
    }

    if (authCode.expiresAt < new Date()) {
        logger.warn(`Rejected: expired code from client_id=${clientId}, user=${authCode.userId}`);
        throw createError({ statusCode: 400, message: 'Authorization code expired' });
    }

    if (authCode.clientId !== clientId || authCode.redirectUri !== redirectUri) {
        logger.warn(
            `Rejected: parameter mismatch for client_id=${clientId}, user=${authCode.userId}`
        );
        throw createError({ statusCode: 400, message: 'Parameter mismatch' });
    }

    // PKCE or client_secret verification
    if (authCode.codeChallenge) {
        if (!codeVerifier) {
            logger.warn(`Rejected: missing code_verifier for PKCE flow, client_id=${clientId}`);
            throw createError({ statusCode: 400, message: 'code_verifier required for PKCE' });
        }
        if (!verifyPKCE(codeVerifier, authCode.codeChallenge, authCode.codeChallengeMethod)) {
            logger.warn(
                `Rejected: invalid code_verifier for client_id=${clientId}, user=${authCode.userId}`
            );
            throw createError({ statusCode: 400, message: 'Invalid code_verifier' });
        }
        logger.debug(`PKCE verified for client_id=${clientId}`);
    } else {
        if (!clientSecret) {
            logger.warn(`Rejected: missing client_secret for client_id=${clientId}`);
            throw createError({ statusCode: 400, message: 'client_secret required' });
        }
        const client = await prisma.oAuthClient.findUnique({ where: { clientId } });
        if (!client) {
            logger.warn(`Rejected: unknown client_id=${clientId} during token exchange`);
            throw createError({ statusCode: 400, message: 'Unknown client' });
        }
        const valid = await bcrypt.compare(clientSecret, client.clientSecretHash);
        if (!valid) {
            logger.warn(
                `Rejected: invalid client_secret for client "${client.name}" (${clientId})`
            );
            throw createError({ statusCode: 401, message: 'Invalid client_secret' });
        }
        logger.debug(`Client secret verified for "${client.name}" (${clientId})`);
    }

    // Mark code as used
    await prisma.oAuthAuthorizationCode.update({
        where: { code },
        data: { used: true }
    });

    // Create access token as JWT
    const config = useRuntimeConfig();
    const expiresIn = 3600; // 1 hour
    const accessToken = jwt.sign(
        {
            sub: authCode.userId,
            client_id: authCode.clientId,
            scopes: authCode.scopes,
            type: 'oauth_access'
        },
        config.jwtSecret,
        { expiresIn }
    );

    // Persist token record
    await prisma.oAuthAccessToken.create({
        data: {
            token: accessToken,
            clientId: authCode.clientId,
            userId: authCode.userId,
            scopes: authCode.scopes,
            expiresAt: new Date(Date.now() + expiresIn * 1000)
        }
    });

    logger.success(
        `Access token issued: user=${authCode.userId}, client_id=${clientId}, scopes=[${authCode.scopes.join(', ')}], expires_in=${expiresIn}s`
    );

    return {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        scope: authCode.scopes.join(' ')
    };
});
