# Preventia (Cogniguard)

Preventia is a cognitive training mobile app for dementia prevention. It targets users 40+ and trains six cognitive domains — memory, attention, processing speed, executive function, language, and visuospatial — through conversational AI exercises with Pierre (a Claude-powered AI companion) and standalone Solo mode exercises.

## Monorepo Structure

```
cogniguard/
├── apps/
│   └── mobile/              # Expo/React Native app
├── services/
│   ├── user-service/        # Auth, user profiles (port 3001)
│   ├── conversation-service/ # AI conversation sessions (port 3002)
│   └── exercise-service/    # Exercise sessions, scoring (port 3003)
├── packages/
│   └── types/               # Shared TypeScript types
└── infrastructure/          # Docker Compose (Postgres + Redis)
```

## Prerequisites

- [Node.js](https://nodejs.org) (LTS)
- [pnpm](https://pnpm.io) 9.0.0 — `corepack enable && corepack prepare pnpm@9.0.0 --activate`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Build shared types

```bash
pnpm --filter @cogniguard/types build
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `JWT_SECRET` — generate with `openssl rand -base64 32`
- `ANTHROPIC_API_KEY` — your Anthropic API key

### 4. Start infrastructure

```bash
cd infrastructure
docker-compose up -d
```

### 5. Run database migrations

```bash
cd services/user-service && pnpm db:migrate
cd ../conversation-service && pnpm db:migrate
cd ../exercise-service && pnpm db:migrate
```

## Running Locally

Open four terminals:

| Terminal | Command | What it runs |
|----------|---------|--------------|
| 1 | `cd infrastructure && docker-compose up` | Postgres 16 + Redis 7 |
| 2 | `cd services/user-service && pnpm dev` | User service on :3001 |
| 3 | `cd services/conversation-service && pnpm dev` | Conversation service on :3002 |
| 4 | `cd services/exercise-service && pnpm dev` | Exercise service on :3003 |
| 5 | `cd apps/mobile && pnpm start` | Expo dev server |

In the Expo terminal, press `i` for iOS Simulator or `a` for Android.

### Mobile API URL

The mobile app needs your Mac's local IP to reach the backend. Update `apps/mobile/app.json`:

```json
"extra": {
  "apiUrl": "http://<your-local-ip>"
}
```

Find your IP with: `ipconfig getifaddr en0`

## Testing

```bash
# All services
pnpm test

# Single service
cd services/exercise-service && pnpm test
```

## Tech Stack

- **Mobile** — Expo 54, React Native, Expo Router, TypeScript
- **Backend** — Node.js, Express, TypeScript, Drizzle ORM
- **Database** — PostgreSQL 16 with pgvector extension
- **Cache** — Redis 7
- **AI** — Anthropic Claude (Haiku for exercise scoring, Sonnet for conversation)
- **Package manager** — pnpm workspaces
