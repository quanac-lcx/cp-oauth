import { consola } from 'consola';
import prisma from '~/server/utils/prisma';
import { getUserIdFromEvent } from '~/server/utils/auth';

const logger = consola.withTag('oauth:clients');

export default defineEventHandler(async event => {
    const userId = getUserIdFromEvent(event);
    const id = getRouterParam(event, 'id');

    if (!id) {
        throw createError({ statusCode: 400, message: 'Client ID required' });
    }

    const client = await prisma.oAuthClient.findUnique({ where: { id } });
    if (!client || client.userId !== userId) {
        logger.warn(`Delete rejected: client id=${id} not found or not owned by user ${userId}`);
        throw createError({ statusCode: 404, message: 'Client not found' });
    }

    await prisma.oAuthClient.delete({ where: { id } });

    logger.success(`Client deleted: "${client.name}" (${client.clientId}) by user ${userId}`);

    return { success: true };
});
