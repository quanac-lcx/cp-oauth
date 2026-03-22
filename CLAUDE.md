# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CP OAuth is an OAuth 2.0 provider built for competitive programming platforms. It allows users to register, link their competitive programming accounts (e.g., Luogu), and authorize third-party applications via standard OAuth 2.0 flows with PKCE support.

## Common Commands

```bash
# Development
npm run dev              # Start Nuxt dev server (SSR enabled)
npm run build            # Production build
npm run preview          # Preview production build

# Code quality
npm run lint             # ESLint check
npm run format           # Prettier format all files

# Database
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma migrate dev   # Create and apply migrations
npx prisma db push       # Push schema to DB without migrations (dev shortcut)

# Infrastructure (PostgreSQL + Redis)
docker compose up -d     # Start Postgres (5432) and Redis (6379)
```

## Code Style

Prettier config (enforced via husky pre-commit with lint-staged):

- 4 spaces, single quotes, no trailing commas, 100 char width, LF endings, no parens on single arrow params

ESLint extends the Nuxt preset with `eslint-config-prettier`. `vue/no-v-html` is turned off.

## Architecture

**Nuxt 4 full-stack app** with SSR, using Nitro server engine for API routes.

### Frontend

- **UI**: Element Plus (via `@element-plus/nuxt`), icons from `lucide-vue-next`
- **State**: Pinia (`@pinia/nuxt`)
- **i18n**: `@nuxtjs/i18n` with `no_prefix` strategy — three locales: `en`, `zh`, `ja` in `i18n/locales/`
- **Color mode**: `@nuxtjs/color-mode` with system preference, dark fallback, stored in `cp-oauth-color-mode`
- **Layouts**: `default` (sidebar + main content) and `auth` (centered, no sidebar — used for login/register)
- **Styling**: SCSS — global styles in `assets/scss/main.scss`, Element Plus overrides in `assets/scss/element-overrides.scss`
- **Markdown**: `utils/markdown.ts` renders Markdown with remark/rehype pipeline and Shiki syntax highlighting (light/dark themes)

### Backend (server/)

- **Database**: Prisma ORM with PostgreSQL — schema in `prisma/schema.prisma`, singleton client in `server/utils/prisma.ts`
- **Cache**: Redis via ioredis — lazy-connected singleton in `server/utils/redis.ts`
- **Auth**: JWT-based — `server/utils/auth.ts` (`getUserIdFromEvent`) and `server/utils/admin.ts` (`requireAdmin`). Tokens passed as `Bearer` in Authorization header, also stored client-side in `auth_token` cookie.
- **System config**: Key-value pairs in `system_config` table with Redis caching (60s TTL) — managed via `server/utils/config.ts`
- **Email**: Nodemailer with SMTP settings pulled from system config — `server/utils/mailer.ts`
- **CAPTCHA**: Optional Cloudflare Turnstile — `composables/useTurnstile.ts` handles client-side widget

### OAuth 2.0 Implementation

- Authorization code flow with PKCE support (S256 and plain)
- Scopes: `openid`, `profile`, `email`, `cp:linked`, `cp:summary`, `cp:details`
- Core logic in `server/utils/oauth.ts`, endpoints in `server/api/oauth/`
- Flow: `authorize.get` → `authorize.post` (user consent) → `token.post` (code exchange) → `userinfo.get`

### Platform Verification System

Extensible system for linking competitive programming accounts in `server/utils/platforms/`:

- `types.ts` defines `PlatformVerifier` interface
- Each platform implements `verify(params)` returning `VerifyResult`
- Currently only Luogu is implemented (`luogu.ts`)
- To add a new platform: create a verifier file, register it in `index.ts`

### API Route Organization (server/api/)

- `auth/` — login, register, email verify, current user (`me`)
- `oauth/` — authorize, token, userinfo, client CRUD
- `account/` — linked account bindings (bind/unbind/list)
- `admin/` — system config, user management (requires admin role)
- `users/` — public user profiles
- `public/` — unauthenticated config endpoint

### Data Model (prisma/schema.prisma)

Five core models: `User`, `OAuthClient`, `OAuthAuthorizationCode`, `OAuthAccessToken`, `LinkedAccount`, plus `SystemConfig` for runtime settings. All use `@@map` to snake_case table names.

## Environment Variables

Copy `.env.example` to `.env`. Required:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — Secret for signing JWT tokens

## Docker

Multi-stage Dockerfile (Node 20 Alpine) — runs `prisma generate` then `nuxt build`, serves from `.output/server/index.mjs` on port 3000. Docker Compose provides only PostgreSQL and Redis (not the app itself).
