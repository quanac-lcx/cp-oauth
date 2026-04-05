import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import prisma from '~/server/utils/prisma';

// --- Platform display names (subset used in card) ---

const PLATFORM_NAMES: Record<string, string> = {
    luogu: 'Luogu',
    codeforces: 'Codeforces',
    atcoder: 'AtCoder',
    github: 'GitHub',
    google: 'Google',
    clist: 'Clist.by'
};

// --- Read & cache local icon SVGs as base64 data URIs ---

const ICON_FILES: Record<string, string> = {
    luogu: 'luogu.svg',
    codeforces: 'codeforces-tricolor.svg',
    atcoder: 'atcoder.svg',
    github: 'github.svg',
    google: 'google.svg',
    clist: 'clist.svg'
};

const iconCache: Record<string, string> = {};

function getIconDataUri(platform: string): string {
    if (iconCache[platform]) return iconCache[platform];
    const filename = ICON_FILES[platform];
    if (!filename) return '';
    const filepath = resolve(process.cwd(), 'public/icons', filename);
    if (!existsSync(filepath)) return '';
    const svg = readFileSync(filepath, 'utf-8');
    const b64 = Buffer.from(svg).toString('base64');
    const uri = `data:image/svg+xml;base64,${b64}`;
    iconCache[platform] = uri;
    return uri;
}

// --- CP OAuth logo as inline SVG path ---

const CP_OAUTH_LOGO = `<text x="0" y="0" font-family="monospace,sans-serif" font-weight="900" font-size="16" fill="__TEXT__" text-anchor="start">CP</text><circle cx="22" cy="0" r="2" fill="__TEXT__"/>`;

// --- Theme colors ---

interface ThemeColors {
    bg: string;
    text: string;
    muted: string;
    border: string;
    cardBg: string;
    accent: string;
}

const THEMES: Record<string, ThemeColors> = {
    light: {
        bg: '#ffffff',
        text: '#24292f',
        muted: '#656d76',
        border: '#d0d7de',
        cardBg: '#f6f8fa',
        accent: '#0969da'
    },
    dark: {
        bg: '#0d1117',
        text: '#e6edf3',
        muted: '#8b949e',
        border: '#30363d',
        cardBg: '#161b22',
        accent: '#58a6ff'
    }
};

// --- i18n ---

interface CardStrings {
    noPublicAccounts: string;
    platformInfo: string; // "{name}'s platforms" — {name} is a placeholder
}

const I18N: Record<string, CardStrings> = {
    en: {
        noPublicAccounts: 'No public accounts',
        platformInfo: "{name}'s Platforms"
    },
    zh: {
        noPublicAccounts: '暂无公开账号',
        platformInfo: '{name} 的平台信息'
    },
    ja: {
        noPublicAccounts: '公開アカウントなし',
        platformInfo: '{name} のプラットフォーム情報'
    }
};

function getStrings(lang: string): CardStrings {
    return I18N[lang] || I18N['en'];
}

// --- SVG builder ---

function escapeXml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

interface LinkedAccountForCard {
    platform: string;
    platformUid: string;
    platformUsername: string | null;
}

function buildCardSvg(params: {
    username: string;
    displayName: string | null;
    accounts: LinkedAccountForCard[];
    width: number;
    colors: ThemeColors;
    lang: string;
}): string {
    const { username, displayName, accounts, width, colors, lang } = params;
    const strings = getStrings(lang);
    const paddingSide = 20;
    const paddingTop = 20;
    const paddingBottom = 20;
    const contentWidth = width - paddingSide * 2;

    // Layout calculations
    const headerTop = paddingTop;
    const headerHeight = 20;
    const headerBaselineY = headerTop + 12;
    const dividerY = headerTop + headerHeight;
    const titleY = dividerY + 16;
    const titleHeight = 20;
    const hasDisplayName = Boolean(displayName);
    const userSectionY = titleY + titleHeight + 4;
    const userSectionHeight = hasDisplayName ? 20 : 0;
    const platformStartY = userSectionY + userSectionHeight + (hasDisplayName ? 6 : 0);
    const platformRowHeight = 28;
    const platformsHeight = accounts.length > 0 ? accounts.length * platformRowHeight : 28;
    const totalHeight = platformStartY + platformsHeight + paddingBottom;

    const logo = CP_OAUTH_LOGO.replace(/__TEXT__/g, colors.accent);

    // Title line: "{displayName}'s Platforms" or "@username's Platforms"
    const titleName = displayName || `@${username}`;
    const titleText = strings.platformInfo.replace('{name}', titleName);
    const titleSvg = `<text x="${paddingSide}" y="${titleY + 14}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="15" font-weight="700" fill="${colors.text}">${escapeXml(titleText)}</text>`;

    // Subtitle: @username (only when displayName exists, since it's already in title otherwise)
    let userInfoSvg = '';
    if (hasDisplayName) {
        userInfoSvg = `
            <text x="${paddingSide}" y="${userSectionY + 14}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="12" fill="${colors.muted}">@${escapeXml(username)}</text>
        `;
    }

    let platformRows = '';
    if (accounts.length === 0) {
        platformRows = `<text x="${paddingSide}" y="${platformStartY + 16}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="12" fill="${colors.muted}">${escapeXml(strings.noPublicAccounts)}</text>`;
    } else {
        // Keep handle first character aligned across all platform rows.
        const platformNameX = paddingSide + 22;
        const handleX = paddingSide + 120;

        accounts.forEach((acc, i) => {
            const y = platformStartY + i * platformRowHeight;
            const iconUri = getIconDataUri(acc.platform);
            const name = PLATFORM_NAMES[acc.platform] || acc.platform;
            const handle = acc.platformUsername || acc.platformUid;

            const iconTag = iconUri
                ? `<image x="${paddingSide}" y="${y + 2}" width="16" height="16" href="${iconUri}" />`
                : '';

            platformRows += `
                ${iconTag}
                <text x="${platformNameX}" y="${y + 14}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="12" font-weight="600" fill="${colors.text}">${escapeXml(name)}</text>
                <text x="${handleX}" y="${y + 14}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="12" fill="${colors.muted}">${escapeXml(handle)}</text>
            `;
        });
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}">
    <rect width="${width}" height="${totalHeight}" rx="8" fill="${colors.bg}" stroke="${colors.border}" stroke-width="1" />

    <!-- Header -->
    <g transform="translate(${paddingSide}, ${headerBaselineY})">
        ${logo}
        <text x="30" y="1" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="14" font-weight="700" fill="${colors.text}">CP OAuth</text>
        <text x="${contentWidth}" y="1" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif" font-size="11" fill="${colors.muted}" text-anchor="end">www.cpoauth.com</text>
    </g>

    <!-- Divider -->
    <line x1="${paddingSide}" y1="${dividerY}" x2="${width - paddingSide}" y2="${dividerY}" stroke="${colors.border}" stroke-width="1" />

    <!-- Title -->
    ${titleSvg}

    <!-- User info -->
    ${userInfoSvg}

    <!-- Platforms -->
    ${platformRows}
</svg>`;
}

// --- Handler ---

export default defineEventHandler(async event => {
    const username = getRouterParam(event, 'username');
    if (!username) {
        throw createError({ statusCode: 400, message: 'Username required' });
    }

    const query = getQuery(event);
    const width = Math.min(800, Math.max(300, Number(query.width) || 480));
    const themeName = query.theme === 'dark' ? 'dark' : 'light';
    const lang = ['zh', 'ja', 'en'].includes(String(query.lang || '')) ? String(query.lang) : 'en';
    const colors = THEMES[themeName];

    const user = await prisma.user.findUnique({
        where: { username },
        select: {
            username: true,
            displayName: true,
            publicLinkedPlatforms: true,
            publicLinkedPlatformsConfigured: true,
            linkedAccounts: {
                select: {
                    platform: true,
                    platformUid: true,
                    platformUsername: true
                },
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!user) {
        throw createError({ statusCode: 404, message: 'User not found' });
    }

    const accounts = user.publicLinkedPlatformsConfigured
        ? user.linkedAccounts.filter(a => user.publicLinkedPlatforms.includes(a.platform))
        : user.linkedAccounts;

    const svg = buildCardSvg({
        username: user.username,
        displayName: user.displayName,
        accounts,
        width,
        colors,
        lang
    });

    setResponseHeaders(event, {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    });

    return svg;
});
