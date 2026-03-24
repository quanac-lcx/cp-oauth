import {
    generateAuthenticationOptions,
    generateRegistrationOptions,
    verifyAuthenticationResponse,
    verifyRegistrationResponse
} from '@simplewebauthn/server';

export interface PasskeyRpInfo {
    rpID: string;
    rpName: string;
    origin: string;
}

type RegistrationResponseType = Parameters<typeof verifyRegistrationResponse>[0]['response'];
type AuthenticationResponseType = Parameters<typeof verifyAuthenticationResponse>[0]['response'];

export function getPasskeyRpInfo(event: Parameters<typeof getRequestURL>[0]): PasskeyRpInfo {
    const url = getRequestURL(event);
    return {
        rpID: url.hostname,
        rpName: 'CP OAuth',
        origin: `${url.protocol}//${url.host}`
    };
}

export async function buildRegistrationOptions(params: {
    rpInfo: PasskeyRpInfo;
    userId: string;
    username: string;
    displayName: string;
    existingCredentialIds: string[];
}) {
    return generateRegistrationOptions({
        rpName: params.rpInfo.rpName,
        rpID: params.rpInfo.rpID,
        userName: params.username,
        userID: new TextEncoder().encode(params.userId),
        userDisplayName: params.displayName,
        timeout: 60000,
        attestationType: 'none',
        authenticatorSelection: {
            residentKey: 'preferred',
            userVerification: 'preferred'
        },
        excludeCredentials: params.existingCredentialIds.map(credentialId => ({
            id: credentialId,
            type: 'public-key'
        }))
    });
}

export async function verifyRegistration(params: {
    response: RegistrationResponseType;
    expectedChallenge: string;
    rpInfo: PasskeyRpInfo;
}) {
    return verifyRegistrationResponse({
        response: params.response,
        expectedChallenge: params.expectedChallenge,
        expectedOrigin: params.rpInfo.origin,
        expectedRPID: params.rpInfo.rpID,
        requireUserVerification: false
    });
}

export async function buildAuthenticationOptions(params: {
    rpInfo: PasskeyRpInfo;
    allowCredentialIds: string[];
}) {
    return generateAuthenticationOptions({
        rpID: params.rpInfo.rpID,
        timeout: 60000,
        userVerification: 'preferred',
        allowCredentials: params.allowCredentialIds.map(credentialId => ({
            id: credentialId,
            type: 'public-key'
        }))
    });
}

export async function verifyAuthentication(params: {
    response: AuthenticationResponseType;
    expectedChallenge: string;
    rpInfo: PasskeyRpInfo;
    credentialId: string;
    publicKey: string;
    counter: number;
    transports?: string[];
}) {
    return verifyAuthenticationResponse({
        response: params.response,
        expectedChallenge: params.expectedChallenge,
        expectedOrigin: params.rpInfo.origin,
        expectedRPID: params.rpInfo.rpID,
        requireUserVerification: false,
        credential: {
            id: params.credentialId,
            publicKey: Buffer.from(params.publicKey, 'base64'),
            counter: params.counter
        }
    });
}
