import prisma from '~/server/utils/prisma';
import { getRedis } from '~/server/utils/redis';
import sanitizeHtml from 'sanitize-html';

const CACHE_KEY = 'public:notices';
const CACHE_TTL = 60; // 1 minute

const NOTICE_ALLOWED_TAGS = [
    'p',
    'br',
    'strong',
    'em',
    'b',
    'i',
    'u',
    's',
    'code',
    'pre',
    'blockquote',
    'ul',
    'ol',
    'li',
    'a',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'span'
];

function sanitizeNoticeContent(content: string): string {
    return sanitizeHtml(content, {
        allowedTags: NOTICE_ALLOWED_TAGS,
        allowedAttributes: {
            a: ['href', 'target', 'rel'],
            span: ['style']
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        allowedSchemesAppliedToAttributes: ['href']
    });
}

export default defineEventHandler(async () => {
    const redis = getRedis();

    try {
        const cached = await redis.get(CACHE_KEY);
        if (cached) return JSON.parse(cached);
    } catch {
        // Redis unavailable
    }

    const noticeClient = prisma.notice;
    const notices = await noticeClient.findMany({
        orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }],
        take: 3,
        select: {
            id: true,
            title: true,
            content: true,
            pinned: true,
            publishedAt: true
        }
    });

    const sanitizedNotices = notices.map(notice => ({
        ...notice,
        content: sanitizeNoticeContent(notice.content)
    }));

    try {
        await redis.set(CACHE_KEY, JSON.stringify(sanitizedNotices), 'EX', CACHE_TTL);
    } catch {
        // Redis unavailable
    }

    return sanitizedNotices;
});
