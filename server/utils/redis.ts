import { consola } from 'consola';
import Redis from 'ioredis';

const logger = consola.withTag('redis');

let redis: Redis | null = null;

export function getRedis(): Redis {
    if (!redis) {
        const config = useRuntimeConfig();
        logger.info(`Connecting to Redis: ${config.redisUrl}`);
        redis = new Redis(config.redisUrl, {
            maxRetriesPerRequest: 3,
            lazyConnect: true
        });
        redis.on('connect', () => logger.success('Redis connected'));
        redis.on('error', err => logger.error('Redis error:', err.message));
        redis.connect().catch(() => {});
    }
    return redis;
}
