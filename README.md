# CP OAuth

CP OAuth is an OAuth 2.0 provider built for competitive programming platforms. Users can register, link their competitive programming accounts (Luogu, AtCoder, Codeforces, Clist, etc.), and authorize third-party applications via standard OAuth 2.0 flows with PKCE support.

## Tech Stack

- **Runtime**: Node.js 20, Python 3.10+
- **Framework**: Nuxt 4 (SSR) with Nitro server engine
- **Database**: PostgreSQL 16 (via Prisma ORM)
- **Cache**: Redis 7 (via ioredis)
- **UI**: Element Plus, Lucide icons, SCSS
- **Auth**: JWT, bcrypt, TOTP 2FA, WebAuthn
- **i18n**: English, Chinese, Japanese

## Prerequisites

- **Node.js** >= 20
- **Python** >= 3.10 (required for Clist OAuth integration)
- **PostgreSQL** >= 16
- **Redis** >= 7
- **npm** (comes with Node.js)

## Installation

### 1. Clone and install Node.js dependencies

```bash
git clone <repo-url> cp-oauth
cd cp-oauth
npm install
```

### 2. Install Python dependencies

Python is required for the Clist OAuth TLS bypass (clist.by's Cloudflare blocks standard HTTP clients).

```bash
pip install -r requirements.txt
```

This installs `curl_cffi`, which provides browser-like TLS fingerprints to bypass Cloudflare's TLS detection.

> **Note**: If your Python binary is not `python` (e.g. `python3`), set the `PYTHON_PATH` environment variable:
>
> ```bash
> export PYTHON_PATH=python3
> ```

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (port 5432) and Redis (port 6379).

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL=postgresql://cpuser:cppass@localhost:5432/cpoauth
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secure-random-secret
```

### 5. Initialize database

```bash
npx prisma generate
npx prisma migrate dev
```

### 6. Start development server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Production Deployment

### Build

```bash
npx prisma generate
npm run build
```

### Run

```bash
node .output/server/index.mjs
```

### Docker

```bash
docker build -t cp-oauth .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -e JWT_SECRET=... \
  cp-oauth
```

> **Docker note**: The default Dockerfile uses `node:20-alpine` which does not include Python. If you need Clist OAuth support in Docker, use a custom image that includes both Node.js and Python with `curl_cffi`, or deploy the Python dependency as a sidecar.

## Common Commands

```bash
# Development
npm run dev              # Start Nuxt dev server
npm run build            # Production build
npm run preview          # Preview production build

# Code quality
npm run lint             # ESLint check
npm run format           # Prettier format

# Database
npx prisma generate      # Regenerate Prisma client
npx prisma migrate dev   # Create and apply migrations
npx prisma db push       # Push schema without migrations

# Infrastructure
docker compose up -d     # Start PostgreSQL + Redis
```

## Environment Variables

| Variable       | Required | Description                               |
| -------------- | -------- | ----------------------------------------- |
| `DATABASE_URL` | Yes      | PostgreSQL connection string              |
| `REDIS_URL`    | Yes      | Redis connection string                   |
| `JWT_SECRET`   | Yes      | Secret for signing JWT tokens             |
| `PYTHON_PATH`  | No       | Path to Python binary (default: `python`) |

## OAuth 2.0 API

### Authorization Code Flow

1. Redirect user to `/oauth/authorize` with `client_id`, `redirect_uri`, `scope`, and PKCE parameters.
2. User consents on the authorization page.
3. User is redirected back to your `redirect_uri` with an authorization `code`.
4. Exchange `code` for `access_token` via POST `/api/oauth/token`.
5. Use `access_token` to call `/api/oauth/userinfo`.

### Endpoints

| Endpoint              | Method | Description                                      |
| --------------------- | ------ | ------------------------------------------------ |
| `/oauth/authorize`    | GET    | Initiate authorization, redirect to consent page |
| `/api/oauth/token`    | POST   | Exchange authorization code for access token     |
| `/api/oauth/userinfo` | GET    | Get user profile (filtered by granted scopes)    |

### Scopes

| Scope             | Description                                                     |
| ----------------- | --------------------------------------------------------------- |
| `openid`          | Required. Returns user's unique identifier (`sub`).             |
| `profile`         | Basic profile: `username`, `display_name`, `avatar_url`, `bio`. |
| `email`           | Email address and verification status.                          |
| `cp:linked`       | All linked competitive programming accounts.                    |
| `link:luogu`      | Linked Luogu account info.                                      |
| `link:atcoder`    | Linked AtCoder account info.                                    |
| `link:codeforces` | Linked Codeforces account info.                                 |
| `link:github`     | Linked GitHub account info.                                     |
| `link:google`     | Linked Google account info.                                     |
| `link:clist`      | Linked Clist account info.                                      |

### Token Exchange Example

```javascript
const response = await fetch('/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        grant_type: 'authorization_code',
        code: 'AUTHORIZATION_CODE',
        redirect_uri: 'https://yourapp.com/callback',
        client_id: 'YOUR_CLIENT_ID',
        client_secret: 'YOUR_CLIENT_SECRET'
    })
});

const { access_token, token_type, expires_in, scope } = await response.json();
```

### PKCE Example (Public Clients)

```javascript
// Generate code_verifier and code_challenge
const codeVerifier = generateRandomString(128);
const data = new TextEncoder().encode(codeVerifier);
const digest = await crypto.subtle.digest('SHA-256', data);
const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

// Step 1: Include code_challenge in authorization request
// /oauth/authorize?code_challenge={codeChallenge}&code_challenge_method=S256

// Step 2: Include code_verifier in token request (replaces client_secret)
await fetch('/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        grant_type: 'authorization_code',
        code: 'AUTHORIZATION_CODE',
        redirect_uri: 'https://yourapp.com/callback',
        client_id: 'YOUR_CLIENT_ID',
        code_verifier: codeVerifier
    })
});
```

## Third-Party Login Providers

Users can sign in or register via external OAuth providers. Configure credentials in the admin panel (`/admin/config`):

| Provider   | Type                        |
| ---------- | --------------------------- |
| GitHub     | OAuth 2.0                   |
| Google     | OpenID Connect              |
| Codeforces | OpenID Connect              |
| Clist      | OAuth 2.0 (with TLS bypass) |
| Luogu      | Paste-based verification    |

## Project Structure

```
cp-oauth/
├── pages/                 # Nuxt file-based routing
│   ├── admin/             # Admin pages (config, users, notices)
│   ├── oauth/             # OAuth flow & third-party callbacks
│   └── ...
├── server/
│   ├── api/               # API routes
│   │   ├── auth/          # Login, register, email verify
│   │   ├── oauth/         # OAuth endpoints (authorize, token, userinfo)
│   │   ├── account/       # Linked accounts management
│   │   ├── admin/         # Admin APIs
│   │   └── public/        # Public config endpoint
│   └── utils/             # Server utilities
│       ├── prisma.ts      # Database client
│       ├── redis.ts       # Cache client
│       ├── auth.ts        # JWT authentication
│       ├── oauth.ts       # OAuth 2.0 core logic
│       ├── clist-oauth.ts # Clist OAuth integration
│       ├── clist-fetch.ts # Node.js wrapper for TLS bypass
│       ├── clist-fetch.py # Python TLS bypass via curl_cffi
│       └── ...
├── prisma/
│   └── schema.prisma      # Database schema
├── i18n/locales/          # Translation files (en, zh, ja)
├── assets/scss/           # Global styles
├── requirements.txt       # Python dependencies
├── docker-compose.yml     # PostgreSQL + Redis
├── Dockerfile             # Production container
└── package.json           # Node.js dependencies
```
