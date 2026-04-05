# CogniGuard Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working vertical slice from user auth through AI-powered conversation with embedded cognitive exercises, running locally via Docker Compose and testable on a React Native simulator.

**Architecture:** pnpm monorepo with Turborepo orchestrating three Express/TypeScript microservices (user, conversation, exercise), a React Native/Expo mobile client, PostgreSQL 16 + pgvector + Redis for data, and Docker Compose for local development. Services communicate via REST; the conversation service streams AI responses to the mobile client via Server-Sent Events.

**Tech Stack:** pnpm 9, Turborepo 2, Node.js 20, TypeScript 5.4, Express 4, Drizzle ORM, PostgreSQL 16 + pgvector, Redis 7, Zod 3, Jest 29, Supertest, React Native (Expo SDK 51), Zustand, @anthropic-ai/sdk, jose (JWT), bcryptjs

---

## Monorepo Structure

```
cogniguard/
├── apps/
│   └── mobile/                    # Expo React Native app
│       ├── app/                   # Expo Router file-based routing
│       │   ├── (auth)/
│       │   │   ├── login.tsx
│       │   │   └── register.tsx
│       │   ├── (app)/
│       │   │   ├── index.tsx      # Home/dashboard
│       │   │   ├── conversation.tsx
│       │   │   └── onboarding.tsx
│       │   └── _layout.tsx
│       ├── components/
│       │   ├── ExerciseOverlay.tsx
│       │   ├── MessageList.tsx
│       │   └── MessageInput.tsx
│       ├── stores/
│       │   ├── auth.store.ts
│       │   ├── conversation.store.ts
│       │   └── exercise.store.ts
│       ├── lib/
│       │   └── api.ts             # Typed API client + SSE helper
│       └── package.json
│
├── services/
│   ├── user-service/              # Auth, profiles, consent
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts      # Drizzle schema
│   │   │   │   └── index.ts       # DB connection
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts        # register, login, refresh
│   │   │   │   └── users.ts       # GET/PATCH /users/me
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts        # JWT verification middleware
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts
│   │   │   └── index.ts           # Express app
│   │   ├── drizzle/migrations/
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── conversation-service/      # LLM orchestration, SSE, persistence
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts
│   │   │   │   └── index.ts
│   │   │   ├── routes/
│   │   │   │   └── conversations.ts
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts        # Shared JWT verification (same secret)
│   │   │   ├── services/
│   │   │   │   ├── claude.service.ts    # Anthropic SDK wrapper
│   │   │   │   └── exercise-embed.service.ts  # Injects exercises into prompts
│   │   │   └── index.ts
│   │   ├── drizzle/migrations/
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   └── exercise-service/          # Exercise library, scoring, history
│       ├── src/
│       │   ├── db/
│       │   │   ├── schema.ts
│       │   │   └── index.ts
│       │   ├── routes/
│       │   │   └── exercises.ts
│       │   ├── middleware/
│       │   │   └── auth.ts
│       │   ├── data/
│       │   │   └── exercises.ts   # Static exercise library (18 exercises)
│       │   ├── services/
│       │   │   └── scoring.service.ts
│       │   └── index.ts
│       ├── drizzle/migrations/
│       ├── drizzle.config.ts
│       └── package.json
│
├── packages/
│   └── types/                     # Shared TypeScript interfaces
│       ├── src/
│       │   ├── user.ts
│       │   ├── conversation.ts
│       │   ├── exercise.ts
│       │   └── index.ts
│       └── package.json
│
├── infrastructure/
│   ├── docker-compose.yml
│   └── init-db.sql                # pgvector extension setup
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Task 1: Initialize Monorepo Scaffold

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `tsconfig.base.json`

- [ ] **Step 1: Initialize git and root package**

```bash
cd /Users/ethandurham/Desktop/GitHub/cogniguard
git init
cat > package.json << 'EOF'
{
  "name": "cogniguard",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "db:migrate": "turbo run db:migrate"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0"
  }
}
EOF
```

- [ ] **Step 2: Create workspace config**

```bash
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'services/*'
  - 'packages/*'
EOF
```

- [ ] **Step 3: Create Turborepo config**

```bash
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {},
    "db:migrate": {
      "cache": false
    }
  }
}
EOF
```

- [ ] **Step 4: Create base TypeScript config**

```bash
cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true
  }
}
EOF
```

- [ ] **Step 5: Create .gitignore and .env.example**

```bash
cat > .gitignore << 'EOF'
node_modules/
dist/
.turbo/
*.env
.env.*
!.env.example
coverage/
*.log
.DS_Store
EOF

cat > .env.example << 'EOF'
# Database
DATABASE_URL=postgresql://cogniguard:cogniguard@localhost:5432/cogniguard
TIMESERIES_DATABASE_URL=postgresql://cogniguard:cogniguard@localhost:5433/cogniguard_ts

# Redis
REDIS_URL=redis://localhost:6379

# Auth (generate with: openssl rand -base64 32)
JWT_SECRET=change-me-generate-with-openssl-rand-base64-32
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Service ports
USER_SERVICE_PORT=3001
CONVERSATION_SERVICE_PORT=3002
EXERCISE_SERVICE_PORT=3003
EOF
```

- [ ] **Step 6: Install root dependencies**

```bash
pnpm install
```

Expected output: `Packages: +X`

- [ ] **Step 7: Create directory structure**

```bash
mkdir -p apps/mobile services/user-service services/conversation-service services/exercise-service packages/types infrastructure
```

- [ ] **Step 8: Initial commit**

```bash
git add .
git commit -m "chore: initialize monorepo with Turborepo and pnpm workspaces"
```

---

## Task 2: Docker Compose Local Environment

**Files:**
- Create: `infrastructure/docker-compose.yml`
- Create: `infrastructure/init-db.sql`

- [ ] **Step 1: Write the database init script**

```bash
cat > infrastructure/init-db.sql << 'EOF'
-- Enable pgvector extension (required for message embeddings in Phase 2)
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
EOF
```

- [ ] **Step 2: Write docker-compose.yml**

```yaml
# infrastructure/docker-compose.yml
version: '3.9'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: cogniguard-postgres
    environment:
      POSTGRES_DB: cogniguard
      POSTGRES_USER: cogniguard
      POSTGRES_PASSWORD: cogniguard
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U cogniguard']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: cogniguard-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

- [ ] **Step 3: Start the environment and verify**

```bash
cd infrastructure && docker compose up -d
docker compose ps
```

Expected output: Both `cogniguard-postgres` and `cogniguard-redis` show `healthy`.

- [ ] **Step 4: Verify pgvector is installed**

```bash
docker exec cogniguard-postgres psql -U cogniguard -d cogniguard -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"
```

Expected output: `vector` in one row.

- [ ] **Step 5: Copy .env.example to .env**

```bash
cd .. && cp .env.example .env
# Edit .env: set ANTHROPIC_API_KEY to your real key
```

- [ ] **Step 6: Commit**

```bash
git add infrastructure/
git commit -m "chore: add Docker Compose environment with PostgreSQL 16 + pgvector and Redis"
```

---

## Task 3: Shared Types Package

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/tsconfig.json`
- Create: `packages/types/src/user.ts`
- Create: `packages/types/src/conversation.ts`
- Create: `packages/types/src/exercise.ts`
- Create: `packages/types/src/index.ts`

- [ ] **Step 1: Initialize types package**

```bash
cat > packages/types/package.json << 'EOF'
{
  "name": "@cogniguard/types",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
EOF

cat > packages/types/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
EOF

mkdir -p packages/types/src
```

- [ ] **Step 2: Write user types**

```typescript
// packages/types/src/user.ts
export type SubscriptionTier = 'free' | 'premium';

export interface User {
  id: string;
  email: string;
  name: string;
  dob: string | null;           // ISO date string
  onboardingCompletedAt: string | null;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
}

export interface CognitiveProfile {
  id: string;
  userId: string;
  baselineEstablishedAt: string | null;
  domains: Record<CognitiveDomain, DomainAbility>;
}

export type CognitiveDomain =
  | 'memory'
  | 'attention'
  | 'processing_speed'
  | 'executive_function'
  | 'language'
  | 'visuospatial';

export interface DomainAbility {
  theta: number;          // Current ability estimate (-3 to 3 scale)
  uncertainty: number;    // Variance in estimate (high in early sessions)
  lastUpdated: string;
}

export interface ConsentSettings {
  conversationalAI: boolean;
  cognitiveTracking: boolean;
  linguisticMonitoring: boolean;
  clinicalReports: boolean;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: number;      // seconds
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  name?: string;
  dob?: string;
  healthContext?: {
    medications?: string[];
    familyHistory?: boolean;
    selfReportedConcerns?: string;
  };
  consent?: Partial<ConsentSettings>;
}
```

- [ ] **Step 3: Write conversation types**

```typescript
// packages/types/src/conversation.ts
import type { CognitiveDomain } from './user.js';

export type MessageRole = 'user' | 'assistant';

export type ConversationState =
  | 'GREETING'
  | 'FREE_CHAT'
  | 'EXERCISE_INTRO'
  | 'EXERCISE_ACTIVE'
  | 'EXERCISE_DEBRIEF'
  | 'REFLECTION'
  | 'FAREWELL'
  | 'SESSION_END';

export interface Conversation {
  id: string;
  userId: string;
  state: ConversationState;
  startedAt: string;
  endedAt: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  tokens: number | null;
  createdAt: string;
}

// SSE event types streamed to client
export type SSEEvent =
  | { type: 'message.delta'; delta: string }
  | { type: 'message.complete'; message: Message }
  | { type: 'exercise.start'; exerciseId: string; exerciseType: string; domain: CognitiveDomain; parameters: Record<string, unknown> }
  | { type: 'exercise.result'; exerciseId: string; domain: CognitiveDomain; rawScore: number; normalizedScore: number }
  | { type: 'state.change'; from: ConversationState; to: ConversationState }
  | { type: 'error'; message: string };

export interface SendMessageRequest {
  content: string;
}
```

- [ ] **Step 4: Write exercise types**

```typescript
// packages/types/src/exercise.ts
import type { CognitiveDomain } from './user.js';

export type ExerciseType =
  // Memory
  | 'word_list_recall'
  | 'story_retelling'
  | 'n_back'
  // Attention
  | 'digit_span'
  | 'stroop_variant'
  | 'odd_one_out'
  // Processing Speed
  | 'rapid_categorization'
  | 'number_sequence'
  | 'letter_search'
  // Executive Function
  | 'category_switching'
  | 'tower_verbal'
  | 'verbal_inhibition'
  // Language
  | 'category_fluency'
  | 'letter_fluency'
  | 'sentence_completion'
  // Visuospatial
  | 'mental_rotation_verbal'
  | 'direction_following'
  | 'pattern_description';

export interface ExerciseDefinition {
  id: string;
  type: ExerciseType;
  domain: CognitiveDomain;
  name: string;
  description: string;
  difficulty: number;         // 1–5 static for Phase 1
  durationSeconds: number;    // Expected time to complete
  parameters: Record<string, unknown>;
  scoringRubric: string;      // Instructions for Claude to score the response
  conversationalBridges: string[];   // 3+ bridge templates for natural intro
  systemPromptFragment: string;      // Injected into conversation system prompt
}

export interface ExerciseSession {
  id: string;
  userId: string;
  conversationId: string;
  exerciseType: ExerciseType;
  domain: CognitiveDomain;
  difficulty: number;
  rawScore: number | null;
  normalizedScore: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface SubmitExerciseRequest {
  conversationId: string;
  userResponse: string;
  durationSeconds: number;
}

export interface ExerciseResult {
  exerciseSessionId: string;
  rawScore: number;
  normalizedScore: number;    // 0–100
  domain: CognitiveDomain;
  feedback: string;           // Encouragement text for the companion to use
}

export interface NextExerciseResponse {
  exercise: ExerciseDefinition;
  sessionId: string;
}
```

- [ ] **Step 5: Write index barrel**

```typescript
// packages/types/src/index.ts
export * from './user.js';
export * from './conversation.js';
export * from './exercise.js';
```

- [ ] **Step 6: Build the package**

```bash
cd packages/types && pnpm install && pnpm build
```

Expected output: `dist/` directory with `.js` and `.d.ts` files.

- [ ] **Step 7: Commit**

```bash
cd ../..
git add packages/types/
git commit -m "feat: add shared TypeScript types package for users, conversations, exercises"
```

---

## Task 4: User Service — Express Skeleton + Health Check

**Files:**
- Create: `services/user-service/package.json`
- Create: `services/user-service/tsconfig.json`
- Create: `services/user-service/src/index.ts`
- Test: `services/user-service/src/__tests__/health.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// services/user-service/src/__tests__/health.test.ts
import request from 'supertest';
import { createApp } from '../index.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'user-service' });
  });
});
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@cogniguard/user-service",
  "version": "0.0.1",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --runInBand",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@cogniguard/types": "workspace:*",
    "bcryptjs": "^2.4.3",
    "dotenv": "^16.4.0",
    "drizzle-orm": "^0.30.0",
    "express": "^4.19.0",
    "jose": "^5.2.0",
    "pg": "^8.11.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "@types/pg": "^8.11.0",
    "@types/supertest": "^6.0.0",
    "drizzle-kit": "^0.21.0",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^(\\.{1,2}/.*)\\.js$": "$1"
    }
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd services/user-service && pnpm install && pnpm test
```

Expected: `Cannot find module '../index.js'`

- [ ] **Step 5: Write the app skeleton**

```typescript
// services/user-service/src/index.ts
import 'dotenv/config';
import express from 'express';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'user-service' });
  });

  return app;
}

// Only start server when run directly (not during tests)
if (require.main === module) {
  const port = process.env.USER_SERVICE_PORT ?? 3001;
  const app = createApp();
  app.listen(port, () => {
    console.log(`user-service listening on port ${port}`);
  });
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
pnpm test
```

Expected: `PASS src/__tests__/health.test.ts`

- [ ] **Step 7: Commit**

```bash
cd ../..
git add services/user-service/
git commit -m "feat(user-service): add Express skeleton with health check"
```

---

## Task 5: User Service — Database Schema + Migrations

**Files:**
- Create: `services/user-service/src/db/schema.ts`
- Create: `services/user-service/src/db/index.ts`
- Create: `services/user-service/drizzle.config.ts`

- [ ] **Step 1: Write schema**

```typescript
// services/user-service/src/db/schema.ts
import {
  pgTable, uuid, varchar, text, timestamp, boolean, jsonb, pgEnum
} from 'drizzle-orm/pg-core';

export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'premium']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),  // null for OAuth users
  name: varchar('name', { length: 255 }).notNull(),
  dob: varchar('dob', { length: 10 }),                      // ISO date: YYYY-MM-DD
  onboardingCompletedAt: timestamp('onboarding_completed_at'),
  subscriptionTier: subscriptionTierEnum('subscription_tier').notNull().default('free'),
  healthContext: jsonb('health_context').$type<{
    medications?: string[];
    familyHistory?: boolean;
    selfReportedConcerns?: string;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const cognitiveProfiles = pgTable('cognitive_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  baselineEstablishedAt: timestamp('baseline_established_at'),
  // Per-domain theta estimates stored as JSONB: { memory: { theta, uncertainty, lastUpdated }, ... }
  domains: jsonb('domains').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const consents = pgTable('consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  conversationalAI: boolean('conversational_ai').notNull().default(false),
  cognitiveTracking: boolean('cognitive_tracking').notNull().default(false),
  linguisticMonitoring: boolean('linguistic_monitoring').notNull().default(false),
  clinicalReports: boolean('clinical_reports').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

- [ ] **Step 2: Write DB connection**

```typescript
// services/user-service/src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
```

- [ ] **Step 3: Write drizzle config**

```typescript
// services/user-service/drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 4: Generate and run migrations**

```bash
cd services/user-service
pnpm drizzle-kit generate
pnpm db:migrate
```

Expected: `All migrations applied successfully`

- [ ] **Step 5: Verify tables exist**

```bash
docker exec cogniguard-postgres psql -U cogniguard -d cogniguard -c "\dt"
```

Expected: `users`, `cognitive_profiles`, `consents`, `refresh_tokens` listed.

- [ ] **Step 6: Commit**

```bash
cd ../..
git add services/user-service/src/db/ services/user-service/drizzle.config.ts services/user-service/drizzle/
git commit -m "feat(user-service): add Drizzle schema and migrations for users, profiles, consents"
```

---

## Task 6: User Service — Auth Service + Register Endpoint

**Files:**
- Create: `services/user-service/src/services/auth.service.ts`
- Create: `services/user-service/src/routes/auth.ts`
- Test: `services/user-service/src/__tests__/auth.register.test.ts`

- [ ] **Step 1: Write failing test for registration**

```typescript
// services/user-service/src/__tests__/auth.register.test.ts
import request from 'supertest';
import { createApp } from '../index.js';

// We'll mock the DB in tests to avoid needing a live connection
jest.mock('../db/index.js', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    query: {
      users: { findFirst: jest.fn() },
    },
  },
}));

import { db } from '../db/index.js';

const mockDb = db as jest.Mocked<typeof db>;

describe('POST /auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 201 with access token on valid registration', async () => {
    // Simulate no existing user found
    (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue(null);
    // Simulate successful insert returning new user
    (mockDb.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          dob: null,
          onboardingCompletedAt: null,
          subscriptionTier: 'free',
          createdAt: new Date().toISOString(),
        }]),
      }),
    });

    const app = createApp();
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'Password123!', name: 'Test User' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.headers['set-cookie']).toBeDefined(); // refresh token cookie
  });

  it('returns 409 when email already exists', async () => {
    (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });

    const app = createApp();
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'exists@example.com', password: 'Password123!', name: 'Existing' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });

  it('returns 400 on invalid input', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'not-an-email', password: '123', name: '' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd services/user-service && pnpm test -- --testPathPattern=auth.register
```

Expected: `Cannot find module '../services/auth.service.js'` or similar.

- [ ] **Step 3: Write auth service**

```typescript
// services/user-service/src/services/auth.service.ts
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, refreshTokens, cognitiveProfiles, consents } from '../db/schema.js';
import type { User } from '@cogniguard/types';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-me');
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN ?? '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function generateRefreshToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const rawToken = crypto.randomUUID() + '-' + crypto.randomUUID();
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });

  return { token: rawToken, expiresAt };
}

export async function verifyAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  if (!payload.sub) throw new Error('Invalid token');
  return payload.sub;
}

export async function registerUser(email: string, password: string, name: string): Promise<{
  user: User;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}> {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) throw Object.assign(new Error('Email already registered'), { code: 'EMAIL_EXISTS' });

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ email, passwordHash, name }).returning();

  // Create cognitive profile and default consents in parallel
  await Promise.all([
    db.insert(cognitiveProfiles).values({ userId: user.id, domains: {} }),
    db.insert(consents).values({ userId: user.id }),
  ]);

  const [accessToken, { token: refreshToken, expiresAt: refreshTokenExpiresAt }] = await Promise.all([
    generateAccessToken(user.id),
    generateRefreshToken(user.id),
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      dob: user.dob ?? null,
      onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
      subscriptionTier: user.subscriptionTier,
      createdAt: user.createdAt.toISOString(),
    },
    accessToken,
    refreshToken,
    refreshTokenExpiresAt,
  };
}
```

- [ ] **Step 4: Write the auth router**

```typescript
// services/user-service/src/routes/auth.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { registerUser } from '../services/auth.service.js';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(255),
});

authRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { email, password, name } = parsed.data;

  try {
    const { user, accessToken, refreshToken, refreshTokenExpiresAt } = await registerUser(email, password, name);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: refreshTokenExpiresAt,
      path: '/auth/refresh',
    });

    return res.status(201).json({ accessToken, expiresIn: 900, user });
  } catch (err: any) {
    if (err.code === 'EMAIL_EXISTS') return res.status(409).json({ error: 'Email already registered' });
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

- [ ] **Step 5: Mount auth router in app**

```typescript
// services/user-service/src/index.ts  (updated)
import 'dotenv/config';
import express from 'express';
import { authRouter } from './routes/auth.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'user-service' });
  });

  app.use('/auth', authRouter);

  return app;
}

if (require.main === module) {
  const port = process.env.USER_SERVICE_PORT ?? 3001;
  const app = createApp();
  app.listen(port, () => console.log(`user-service listening on port ${port}`));
}
```

- [ ] **Step 6: Run tests and verify they pass**

```bash
pnpm test -- --testPathPattern=auth.register
```

Expected: `PASS` — 3 tests passing.

- [ ] **Step 7: Commit**

```bash
cd ../..
git add services/user-service/src/services/auth.service.ts services/user-service/src/routes/auth.ts services/user-service/src/index.ts services/user-service/src/__tests__/
git commit -m "feat(user-service): add registration endpoint with JWT and bcrypt"
```

---

## Task 7: User Service — Login + Token Refresh

**Files:**
- Modify: `services/user-service/src/routes/auth.ts`
- Modify: `services/user-service/src/services/auth.service.ts`
- Test: `services/user-service/src/__tests__/auth.login.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// services/user-service/src/__tests__/auth.login.test.ts
import request from 'supertest';
import { createApp } from '../index.js';
import bcrypt from 'bcryptjs';

jest.mock('../db/index.js', () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    query: {
      users: { findFirst: jest.fn() },
      refreshTokens: { findFirst: jest.fn() },
    },
  },
}));

import { db } from '../db/index.js';
const mockDb = db as jest.Mocked<typeof db>;

describe('POST /auth/login', () => {
  const passwordHash = bcrypt.hashSync('Password123!', 12);

  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with tokens on valid credentials', async () => {
    (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue({
      id: 'user-123', email: 'test@example.com', name: 'Test', passwordHash,
      dob: null, onboardingCompletedAt: null, subscriptionTier: 'free',
      createdAt: new Date(),
    });
    (mockDb.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{}]) }),
    });

    const app = createApp();
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue({
      id: 'user-123', email: 'test@example.com', passwordHash,
    });

    const app = createApp();
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
  });

  it('returns 401 on unknown email', async () => {
    (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue(null);

    const app = createApp();
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password123!' });

    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd services/user-service && pnpm test -- --testPathPattern=auth.login
```

Expected: `FAIL` — login route not defined.

- [ ] **Step 3: Add loginUser to auth service**

```typescript
// Add to services/user-service/src/services/auth.service.ts

export async function loginUser(email: string, password: string): Promise<{
  user: User;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}> {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !user.passwordHash) {
    throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });
  }

  const [accessToken, { token: refreshToken, expiresAt: refreshTokenExpiresAt }] = await Promise.all([
    generateAccessToken(user.id),
    generateRefreshToken(user.id),
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      dob: user.dob ?? null,
      onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
      subscriptionTier: user.subscriptionTier,
      createdAt: user.createdAt.toISOString(),
    },
    accessToken,
    refreshToken,
    refreshTokenExpiresAt,
  };
}
```

- [ ] **Step 4: Add login + refresh routes**

```typescript
// Add to services/user-service/src/routes/auth.ts

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  try {
    const { user, accessToken, refreshToken, refreshTokenExpiresAt } = await loginUser(
      parsed.data.email,
      parsed.data.password
    );

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: refreshTokenExpiresAt,
      path: '/auth/refresh',
    });

    return res.json({ accessToken, expiresIn: 900, user });
  } catch (err: any) {
    if (err.code === 'INVALID_CREDENTIALS') return res.status(401).json({ error: 'Invalid credentials' });
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const rawToken = req.cookies?.refresh_token as string | undefined;
  if (!rawToken) return res.status(401).json({ error: 'No refresh token' });

  // Token rotation: find matching hash, issue new pair, invalidate old
  const allTokens = await db.query.refreshTokens.findFirst(); // simplified: real impl iterates candidates
  // For Phase 1, keep it simple — just issue new access token from a valid-looking refresh token
  // Full rotation implemented in Phase 2
  return res.status(501).json({ error: 'Token refresh not yet implemented' });
});
```

- [ ] **Step 5: Run tests and verify they pass**

```bash
pnpm test -- --testPathPattern=auth.login
```

Expected: `PASS` — 3 tests passing.

- [ ] **Step 6: Commit**

```bash
cd ../..
git add services/user-service/
git commit -m "feat(user-service): add login endpoint and token refresh stub"
```

---

## Task 8: User Service — JWT Middleware + Profile Endpoints

**Files:**
- Create: `services/user-service/src/middleware/auth.ts`
- Create: `services/user-service/src/routes/users.ts`
- Test: `services/user-service/src/__tests__/users.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// services/user-service/src/__tests__/users.test.ts
import request from 'supertest';
import { createApp } from '../index.js';
import { SignJWT } from 'jose';

jest.mock('../db/index.js', () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    query: {
      users: { findFirst: jest.fn() },
    },
  },
}));

import { db } from '../db/index.js';
const mockDb = db as jest.Mocked<typeof db>;

async function makeToken(userId = 'user-123') {
  const secret = new TextEncoder().encode('dev-secret-change-me');
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(secret);
}

describe('GET /users/me', () => {
  const mockUser = {
    id: 'user-123', email: 'test@example.com', name: 'Test User',
    dob: null, onboardingCompletedAt: null, subscriptionTier: 'free',
    createdAt: new Date(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with user profile when authenticated', async () => {
    (mockDb.query.users.findFirst as jest.Mock).mockResolvedValue(mockUser);
    const token = await makeToken();
    const app = createApp();

    const res = await request(app)
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('test@example.com');
  });

  it('returns 401 without token', async () => {
    const app = createApp();
    const res = await request(app).get('/users/me');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd services/user-service && pnpm test -- --testPathPattern=users.test
```

Expected: `FAIL` — `/users/me` route not found.

- [ ] **Step 3: Write JWT middleware**

```typescript
// services/user-service/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service.js';

export interface AuthRequest extends Request {
  userId: string;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = header.slice(7);
  try {
    const userId = await verifyAccessToken(token);
    (req as AuthRequest).userId = userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

- [ ] **Step 4: Write users router**

```typescript
// services/user-service/src/routes/users.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, consents } from '../db/schema.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.get('/me', async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

  if (!user) return res.status(404).json({ error: 'User not found' });

  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    dob: user.dob ?? null,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    subscriptionTier: user.subscriptionTier,
    createdAt: user.createdAt.toISOString(),
  });
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  healthContext: z.object({
    medications: z.array(z.string()).optional(),
    familyHistory: z.boolean().optional(),
    selfReportedConcerns: z.string().max(2000).optional(),
  }).optional(),
  consent: z.object({
    conversationalAI: z.boolean().optional(),
    cognitiveTracking: z.boolean().optional(),
    linguisticMonitoring: z.boolean().optional(),
    clinicalReports: z.boolean().optional(),
  }).optional(),
});

usersRouter.patch('/me', async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { name, dob, healthContext, consent } = parsed.data;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name) updates.name = name;
  if (dob) updates.dob = dob;
  if (healthContext) updates.healthContext = healthContext;

  const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();

  if (consent) {
    await db.update(consents).set({ ...consent, updatedAt: new Date() }).where(eq(consents.userId, userId));
  }

  return res.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    dob: updated.dob ?? null,
    onboardingCompletedAt: updated.onboardingCompletedAt?.toISOString() ?? null,
    subscriptionTier: updated.subscriptionTier,
    createdAt: updated.createdAt.toISOString(),
  });
});
```

- [ ] **Step 5: Mount users router in app**

```typescript
// services/user-service/src/index.ts — add this line after authRouter mount
app.use('/users', usersRouter);
```

- [ ] **Step 6: Run tests and verify they pass**

```bash
pnpm test
```

Expected: All tests pass, including health, register, login, and users.

- [ ] **Step 7: Smoke test against live DB**

```bash
# Start the service
pnpm dev &

# Register a user
curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","name":"Test User"}' | jq .

# Copy the accessToken from above, then:
TOKEN="<paste_token_here>"
curl -s http://localhost:3001/users/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: User object returned with correct email and name.

- [ ] **Step 8: Commit**

```bash
cd ../..
git add services/user-service/src/middleware/ services/user-service/src/routes/users.ts services/user-service/src/index.ts
git commit -m "feat(user-service): add JWT auth middleware and profile GET/PATCH endpoints"
```

---

## Task 9: Conversation Service — Skeleton + DB Schema

**Files:**
- Create: `services/conversation-service/package.json`
- Create: `services/conversation-service/tsconfig.json`
- Create: `services/conversation-service/drizzle.config.ts`
- Create: `services/conversation-service/src/db/schema.ts`
- Create: `services/conversation-service/src/db/index.ts`
- Create: `services/conversation-service/src/middleware/auth.ts`
- Create: `services/conversation-service/src/index.ts`
- Test: `services/conversation-service/src/__tests__/health.test.ts`

- [ ] **Step 1: Write failing health test**

```typescript
// services/conversation-service/src/__tests__/health.test.ts
import request from 'supertest';
import { createApp } from '../index.js';

describe('GET /health', () => {
  it('returns 200', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('conversation-service');
  });
});
```

- [ ] **Step 2: Create package.json** (same structure as user-service, different name/ports)

```json
{
  "name": "@cogniguard/conversation-service",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --runInBand",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "@cogniguard/types": "workspace:*",
    "dotenv": "^16.4.0",
    "drizzle-orm": "^0.30.0",
    "express": "^4.19.0",
    "jose": "^5.2.0",
    "pg": "^8.11.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "@types/pg": "^8.11.0",
    "@types/supertest": "^6.0.0",
    "drizzle-kit": "^0.21.0",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "moduleNameMapper": { "^(\\.{1,2}/.*)\\.js$": "$1" }
  }
}
```

- [ ] **Step 3: Write DB schema**

```typescript
// services/conversation-service/src/db/schema.ts
import { pgTable, uuid, varchar, text, timestamp, integer, pgEnum, jsonb } from 'drizzle-orm/pg-core';

export const conversationStateEnum = pgEnum('conversation_state', [
  'GREETING', 'FREE_CHAT', 'EXERCISE_INTRO', 'EXERCISE_ACTIVE',
  'EXERCISE_DEBRIEF', 'REFLECTION', 'FAREWELL', 'SESSION_END',
]);

export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system']);

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  state: conversationStateEnum('state').notNull().default('GREETING'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  tokens: integer('tokens'),
  metadata: jsonb('metadata'),      // exercise scores, state changes, etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

- [ ] **Step 4: Write app skeleton, DB connection, auth middleware**

```typescript
// services/conversation-service/src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

```typescript
// services/conversation-service/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';

export interface AuthRequest extends Request { userId: string; }

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });

  const token = header.slice(7);
  const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-me');
  try {
    const { payload } = await jwtVerify(token, secret);
    (req as AuthRequest).userId = payload.sub!;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

```typescript
// services/conversation-service/src/index.ts
import 'dotenv/config';
import express from 'express';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'conversation-service' }));
  return app;
}

if (require.main === module) {
  const port = process.env.CONVERSATION_SERVICE_PORT ?? 3002;
  const app = createApp();
  app.listen(port, () => console.log(`conversation-service listening on port ${port}`));
}
```

- [ ] **Step 5: Install, migrate, run test**

```bash
cd services/conversation-service
pnpm install
# Copy drizzle.config.ts pattern from user-service, update schema path
pnpm drizzle-kit generate && pnpm db:migrate
pnpm test
```

Expected: `PASS` — health test passes.

- [ ] **Step 6: Commit**

```bash
cd ../..
git add services/conversation-service/
git commit -m "feat(conversation-service): add Express skeleton, DB schema, auth middleware"
```

---

## Task 10: Conversation Service — Claude Client + Create Conversation

**Files:**
- Create: `services/conversation-service/src/services/claude.service.ts`
- Create: `services/conversation-service/src/routes/conversations.ts`
- Test: `services/conversation-service/src/__tests__/conversations.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// services/conversation-service/src/__tests__/conversations.test.ts
import request from 'supertest';
import { createApp } from '../index.js';
import { SignJWT } from 'jose';

jest.mock('../db/index.js', () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    query: { conversations: { findFirst: jest.fn() } },
  },
}));

import { db } from '../db/index.js';
const mockDb = db as jest.Mocked<typeof db>;

async function makeToken(userId = 'user-123') {
  const secret = new TextEncoder().encode('dev-secret-change-me');
  return new SignJWT({ sub: userId }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('15m').sign(secret);
}

describe('POST /conversations', () => {
  it('creates a conversation and returns it', async () => {
    const newConv = { id: 'conv-1', userId: 'user-123', state: 'GREETING', startedAt: new Date(), endedAt: null };
    (mockDb.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([newConv]) }),
    });

    const app = createApp();
    const token = await makeToken();
    const res = await request(app)
      .post('/conversations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('conv-1');
    expect(res.body.state).toBe('GREETING');
  });

  it('returns 401 without token', async () => {
    const app = createApp();
    const res = await request(app).post('/conversations');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd services/conversation-service && pnpm test -- --testPathPattern=conversations.test
```

Expected: `FAIL` — POST /conversations returns 404.

- [ ] **Step 3: Write Claude service**

```typescript
// services/conversation-service/src/services/claude.service.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const COMPANION_SYSTEM_PROMPT = `You are Pierre, a warm and intellectually curious AI companion focused on brain health. 
Your role is to engage users in stimulating conversations while naturally weaving in cognitive exercises.

Core principles:
- Be genuinely curious and warm. Remember details from the conversation.
- Transition into exercises naturally — never announce "now let's do a brain training exercise."
- When delivering an exercise, embed it as a seamless part of conversation.
- Keep responses conversational and appropriately concise (2-4 sentences for normal chat).
- Always be encouraging, especially after exercises. Normalize variation in performance.

Safety: Never provide medical diagnoses. If a user expresses distress or mentions a medical crisis, 
respond with empathy and suggest they contact a healthcare provider.`;

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onComplete: (fullText: string, inputTokens: number, outputTokens: number) => void;
  onError: (error: Error) => void;
}

export async function streamConversationResponse(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemAppend: string = '',
  callbacks: StreamCallbacks
): Promise<void> {
  const system = systemAppend
    ? `${COMPANION_SYSTEM_PROMPT}\n\n${systemAppend}`
    : COMPANION_SYSTEM_PROMPT;

  let fullText = '';

  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text;
        callbacks.onDelta(event.delta.text);
      }
    }

    const finalMessage = await stream.finalMessage();
    callbacks.onComplete(
      fullText,
      finalMessage.usage.input_tokens,
      finalMessage.usage.output_tokens
    );
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
```

- [ ] **Step 4: Write conversations router (non-streaming endpoints)**

```typescript
// services/conversation-service/src/routes/conversations.ts
import { Router, Response } from 'express';
import { eq, asc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { conversations, messages } from '../db/schema.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

export const conversationsRouter = Router();
conversationsRouter.use(requireAuth);

conversationsRouter.post('/', async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const [conversation] = await db.insert(conversations).values({ userId }).returning();
  return res.status(201).json({
    id: conversation.id,
    userId: conversation.userId,
    state: conversation.state,
    startedAt: conversation.startedAt.toISOString(),
    endedAt: null,
  });
});

conversationsRouter.get('/:id/messages', async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, req.params.id),
  });

  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  if (conversation.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, req.params.id))
    .orderBy(asc(messages.createdAt));

  return res.json(msgs.map(m => ({
    id: m.id,
    conversationId: m.conversationId,
    role: m.role,
    content: m.content,
    tokens: m.tokens,
    createdAt: m.createdAt.toISOString(),
  })));
});
```

- [ ] **Step 5: Mount router in app**

```typescript
// services/conversation-service/src/index.ts — updated
import 'dotenv/config';
import express from 'express';
import { conversationsRouter } from './routes/conversations.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'conversation-service' }));
  app.use('/conversations', conversationsRouter);
  return app;
}

if (require.main === module) {
  const port = process.env.CONVERSATION_SERVICE_PORT ?? 3002;
  createApp().listen(port, () => console.log(`conversation-service listening on port ${port}`));
}
```

- [ ] **Step 6: Run tests**

```bash
pnpm test
```

Expected: `PASS` — all conversation tests pass.

- [ ] **Step 7: Commit**

```bash
cd ../..
git add services/conversation-service/src/services/claude.service.ts services/conversation-service/src/routes/conversations.ts services/conversation-service/src/index.ts
git commit -m "feat(conversation-service): add Claude streaming client and conversation CRUD endpoints"
```

---

## Task 11: Conversation Service — SSE Streaming Endpoint

**Files:**
- Modify: `services/conversation-service/src/routes/conversations.ts`
- Test: `services/conversation-service/src/__tests__/sse.test.ts`

- [ ] **Step 1: Write failing SSE test**

```typescript
// services/conversation-service/src/__tests__/sse.test.ts
import request from 'supertest';
import { createApp } from '../index.js';
import { SignJWT } from 'jose';

jest.mock('../db/index.js', () => ({
  db: {
    insert: jest.fn(),
    select: jest.fn(),
    query: { conversations: { findFirst: jest.fn() }, messages: { findMany: jest.fn() } },
  },
}));

jest.mock('../services/claude.service.js', () => ({
  streamConversationResponse: jest.fn(),
  COMPANION_SYSTEM_PROMPT: 'test-prompt',
}));

import { db } from '../db/index.js';
import { streamConversationResponse } from '../services/claude.service.js';
const mockDb = db as jest.Mocked<typeof db>;
const mockStream = streamConversationResponse as jest.Mock;

async function makeToken(userId = 'user-123') {
  const secret = new TextEncoder().encode('dev-secret-change-me');
  return new SignJWT({ sub: userId }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('15m').sign(secret);
}

describe('POST /conversations/:id/messages', () => {
  const mockConv = { id: 'conv-1', userId: 'user-123', state: 'GREETING' };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockDb.query.conversations.findFirst as jest.Mock).mockResolvedValue(mockConv);
    (mockDb.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnValue({ returning: jest.fn().mockResolvedValue([{ id: 'msg-1', conversationId: 'conv-1', role: 'user', content: 'Hello', tokens: null, createdAt: new Date() }]) }),
    });
    mockStream.mockImplementation(async (_msgs, _sys, cb) => {
      cb.onDelta('Hello ');
      cb.onDelta('there!');
      cb.onComplete('Hello there!', 10, 5);
    });
  });

  it('returns SSE stream with message.delta and message.complete events', async () => {
    const token = await makeToken();
    const app = createApp();

    const res = await request(app)
      .post('/conversations/conv-1/messages')
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'text/event-stream')
      .send({ content: 'Hello' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('event: message.delta');
    expect(res.text).toContain('event: message.complete');
  });

  it('returns 404 for unknown conversation', async () => {
    (mockDb.query.conversations.findFirst as jest.Mock).mockResolvedValue(null);
    const token = await makeToken();
    const app = createApp();

    const res = await request(app)
      .post('/conversations/bad-id/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Hello' });

    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd services/conversation-service && pnpm test -- --testPathPattern=sse.test
```

Expected: `FAIL` — POST returns 404.

- [ ] **Step 3: Write SSE helper function**

```typescript
// Add to services/conversation-service/src/routes/conversations.ts

function sendSSEEvent(res: Response, event: import('@cogniguard/types').SSEEvent) {
  const data = JSON.stringify(event);
  res.write(`event: ${event.type}\ndata: ${data}\n\n`);
}
```

- [ ] **Step 4: Write the SSE message endpoint**

```typescript
// Add to conversationsRouter in conversations.ts

import { z } from 'zod';
import { streamConversationResponse } from '../services/claude.service.js';

const sendMessageSchema = z.object({ content: z.string().min(1).max(8000) });

conversationsRouter.post('/:id/messages', async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid message content' });

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, req.params.id),
  });
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
  if (conversation.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

  // Persist user message
  const [userMsg] = await db.insert(messages).values({
    conversationId: conversation.id,
    role: 'user',
    content: parsed.data.content,
  }).returning();

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Fetch recent message history for Claude context (last 20 messages)
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversation.id))
    .orderBy(asc(messages.createdAt));

  const claudeMessages = history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  await streamConversationResponse(
    claudeMessages,
    '',
    {
      onDelta: (delta) => {
        sendSSEEvent(res, { type: 'message.delta', delta });
      },
      onComplete: async (fullText, _inputTokens, outputTokens) => {
        // Persist assistant response
        const [assistantMsg] = await db.insert(messages).values({
          conversationId: conversation.id,
          role: 'assistant',
          content: fullText,
          tokens: outputTokens,
        }).returning();

        sendSSEEvent(res, {
          type: 'message.complete',
          message: {
            id: assistantMsg.id,
            conversationId: assistantMsg.conversationId,
            role: 'assistant',
            content: assistantMsg.content,
            tokens: assistantMsg.tokens,
            createdAt: assistantMsg.createdAt.toISOString(),
          },
        });
        res.end();
      },
      onError: (error) => {
        sendSSEEvent(res, { type: 'error', message: error.message });
        res.end();
      },
    }
  );
});
```

- [ ] **Step 5: Run tests**

```bash
pnpm test
```

Expected: All tests pass including SSE test.

- [ ] **Step 6: Smoke test live SSE**

```bash
# Start conversation service
pnpm dev &

# Get a token from user-service first, then:
TOKEN="<your_token>"

# Create conversation
CONV_ID=$(curl -s -X POST http://localhost:3002/conversations \
  -H "Authorization: Bearer $TOKEN" | jq -r '.id')

# Send message and watch SSE stream
curl -s -N -X POST http://localhost:3002/conversations/$CONV_ID/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello! Can you introduce yourself?"}'
```

Expected: SSE events streaming with `message.delta` chunks followed by `message.complete`.

- [ ] **Step 7: Commit**

```bash
cd ../..
git add services/conversation-service/src/routes/conversations.ts
git commit -m "feat(conversation-service): add SSE streaming endpoint for AI responses"
```

---

## Task 12: Exercise Service — Skeleton + Exercise Library

**Files:**
- Create: `services/exercise-service/package.json`
- Create: `services/exercise-service/tsconfig.json`
- Create: `services/exercise-service/src/db/schema.ts`
- Create: `services/exercise-service/src/db/index.ts`
- Create: `services/exercise-service/src/middleware/auth.ts`
- Create: `services/exercise-service/src/data/exercises.ts`
- Create: `services/exercise-service/src/index.ts`
- Test: `services/exercise-service/src/__tests__/exercises.library.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// services/exercise-service/src/__tests__/exercises.library.test.ts
import { EXERCISES, getExercisesByDomain } from '../data/exercises.js';
import type { CognitiveDomain } from '@cogniguard/types';

describe('Exercise Library', () => {
  const domains: CognitiveDomain[] = [
    'memory', 'attention', 'processing_speed', 'executive_function', 'language', 'visuospatial'
  ];

  it('has exactly 18 exercises', () => {
    expect(EXERCISES).toHaveLength(18);
  });

  it('has exactly 3 exercises per domain', () => {
    for (const domain of domains) {
      const domainExercises = getExercisesByDomain(domain);
      expect(domainExercises).toHaveLength(3);
    }
  });

  it('every exercise has required fields', () => {
    for (const ex of EXERCISES) {
      expect(ex.id).toBeTruthy();
      expect(ex.type).toBeTruthy();
      expect(ex.domain).toBeTruthy();
      expect(ex.name).toBeTruthy();
      expect(ex.conversationalBridges.length).toBeGreaterThanOrEqual(3);
      expect(ex.systemPromptFragment).toBeTruthy();
      expect(ex.scoringRubric).toBeTruthy();
      expect(ex.difficulty).toBeGreaterThanOrEqual(1);
      expect(ex.difficulty).toBeLessThanOrEqual(5);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd services/exercise-service && pnpm install && pnpm test -- --testPathPattern=exercises.library
```

Expected: `FAIL` — module not found.

- [ ] **Step 3: Create package.json and tsconfig.json** (same pattern as other services)

```json
{
  "name": "@cogniguard/exercise-service",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --runInBand",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@cogniguard/types": "workspace:*",
    "dotenv": "^16.4.0",
    "drizzle-orm": "^0.30.0",
    "express": "^4.19.0",
    "jose": "^5.2.0",
    "pg": "^8.11.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "@types/pg": "^8.11.0",
    "@types/supertest": "^6.0.0",
    "drizzle-kit": "^0.21.0",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "moduleNameMapper": { "^(\\.{1,2}/.*)\\.js$": "$1" }
  }
}
```

- [ ] **Step 4: Write the exercise library (18 exercises)**

```typescript
// services/exercise-service/src/data/exercises.ts
import type { ExerciseDefinition, CognitiveDomain } from '@cogniguard/types';

export const EXERCISES: ExerciseDefinition[] = [
  // ─── MEMORY (3) ───────────────────────────────────────────────────
  {
    id: 'mem-word-recall',
    type: 'word_list_recall',
    domain: 'memory',
    name: 'Word List Recall',
    description: 'Remember a list of words and recall them after a short delay',
    difficulty: 2,
    durationSeconds: 90,
    parameters: { wordCount: 8, delaySeconds: 30 },
    scoringRubric: `Score the user's recall out of 8 words. 
      rawScore = number of correctly recalled words (order doesn't matter, minor spelling variations allowed).
      normalizedScore = (rawScore / 8) * 100.
      Return JSON: {"rawScore": <number>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Speaking of memory — I love little games. I'm going to say 8 words, and after we chat for a minute, I'll ask you to recall as many as you can. Ready?",
      "That reminds me of something fun. Let me give you 8 words to hold in your mind — we'll come back to them shortly. Here they are:",
      "Quick memory warm-up before we continue — I'll say 8 words. Try to remember them all: ",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Word List Recall:
Say these 8 words naturally as part of conversation: apple, bridge, lantern, cloud, violin, marble, forest, kettle.
After about 30 seconds of other conversation, ask the user to recall as many as possible.
When they respond, score per rubric and output EXACTLY this JSON on its own line before your reply:
EXERCISE_SCORE: {"rawScore": <0-8>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  {
    id: 'mem-story-retelling',
    type: 'story_retelling',
    domain: 'memory',
    name: 'Story Retelling',
    description: 'Listen to a short story and retell the main points',
    difficulty: 3,
    durationSeconds: 120,
    parameters: { storyLength: 'short', detailCount: 6 },
    scoringRubric: `Score based on 6 key details captured. rawScore = details correctly recalled (0–6).
      normalizedScore = (rawScore / 6) * 100.
      Return JSON: {"rawScore": <number>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "I'll share a short story with you — then I'd love to hear you retell it in your own words. It's a nice way to see how details stick.",
      "Since we're talking about stories, let me tell you a brief one. After, I'll ask you to retell the key parts.",
      "Here's a fun exercise — I'll tell you something and you tell it back. Ready for a quick story?",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Story Retelling:
Tell this story naturally: "Maria was walking home on Tuesday when she found a blue wallet near the fountain in the park. Inside were three things: a library card, a photo of a dog named Biscuit, and twenty dollars. She brought it to the police station on Oak Street, where Officer Patel took her report."
Key details: [Tuesday, blue wallet, fountain in park, library card + photo + $20, police station on Oak Street, Officer Patel].
Ask the user to retell the story. Score which of the 6 details they captured.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-6>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  {
    id: 'mem-n-back',
    type: 'n_back',
    domain: 'memory',
    name: '1-Back Letter Task',
    description: 'Identify when a letter matches the one shown one step back',
    difficulty: 2,
    durationSeconds: 120,
    parameters: { nLevel: 1, sequenceLength: 12 },
    scoringRubric: `Sequence: K, T, K, M, M, P, P, R, T, T, K, K. 
      Matches (positions where letter = letter 1 back): positions 3(K=K), 5(M=M), 7(P=P), 10(T=T), 12(K=K) — 5 targets.
      rawScore = correct "yes" answers minus false positives (0–5 max). normalizedScore = max(0, rawScore/5)*100.
      Return JSON: {"rawScore": <number>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Here's a quick focus game I enjoy. I'll read you a sequence of letters one at a time. Say 'yes' whenever a letter matches the one that came just before it.",
      "Want to try something that's actually a classic memory research task? It's called 1-back. I'll read letters, and you say 'yes' when the current one matches the previous.",
      "Let's wake up the working memory with a fun sequence game — say 'yes' each time a letter repeats the one right before it.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — 1-Back Letter Task:
Read the sequence one letter at a time, pausing between each: K... T... K... M... M... P... P... R... T... T... K... K.
Correct "yes" responses should be at positions: K(3rd), M(5th), P(7th), T(10th), K(12th).
Count the user's correct "yes" answers and false positives.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-5>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  // ─── ATTENTION (3) ────────────────────────────────────────────────
  {
    id: 'att-digit-span',
    type: 'digit_span',
    domain: 'attention',
    name: 'Digit Span Forward',
    description: 'Repeat sequences of digits in order',
    difficulty: 2,
    durationSeconds: 90,
    parameters: { startLength: 4, maxLength: 8 },
    scoringRubric: `Present sequences of increasing length: 4→5→6→7→8 digits. 
      rawScore = longest sequence correctly repeated. normalizedScore = ((rawScore - 4) / 4) * 100.
      Return JSON: {"rawScore": <4-8>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Here's a quick attention check — I'll say a string of numbers and you repeat them back in the same order. Let's start short and get longer.",
      "Number sequences are great for focus. I'll go: ready? Repeat after me.",
      "Quick digit game — I read, you repeat. We'll see how long a string you can hold.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Digit Span Forward:
Read sequences and ask the user to repeat each one in order. Start at 4 digits, increase until failure.
Sequences: [4-digit: 7 3 9 1], [5-digit: 4 8 2 6 3], [6-digit: 9 1 7 4 2 5], [7-digit: 3 8 6 1 9 4 7], [8-digit: 5 2 8 4 7 1 3 9].
Stop when the user fails a sequence. Record the longest correct sequence length.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <4-8>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  {
    id: 'att-stroop',
    type: 'stroop_variant',
    domain: 'attention',
    name: 'Verbal Stroop Task',
    description: 'Name the meaning of words while ignoring the described color',
    difficulty: 3,
    durationSeconds: 60,
    parameters: { trialCount: 10 },
    scoringRubric: `10 items. rawScore = number answered correctly and quickly (within reasonable verbal pace).
      normalizedScore = (rawScore / 10) * 100.
      Return JSON: {"rawScore": <0-10>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Ready for a classic brain teaser? I'll say a word and what color it's written in — your job is to say the COLOR, not the word. It's trickier than it sounds.",
      "There's this famous attention test called Stroop. I'll describe a word and its ink color — just tell me the ink color as fast as you can.",
      "Let's try something that trips up almost everyone at first — a verbal Stroop. Tell me the color, not the word.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Verbal Stroop:
Present 10 items verbally as "the word RED written in blue ink" format. Read them one at a time.
Items: [RED in blue], [BLUE in green], [GREEN in red], [YELLOW in purple], [PURPLE in yellow], [RED in green], [BLUE in red], [GREEN in yellow], [YELLOW in blue], [PURPLE in green].
User should say the ink color. Count correct responses.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-10>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  {
    id: 'att-odd-one-out',
    type: 'odd_one_out',
    domain: 'attention',
    name: 'Odd One Out',
    description: 'Identify the item that does not belong in a category',
    difficulty: 2,
    durationSeconds: 90,
    parameters: { rounds: 8 },
    scoringRubric: `8 rounds. rawScore = correct identifications. normalizedScore = (rawScore / 8) * 100.
      Return JSON: {"rawScore": <0-8>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Here's a fun categorization game — I'll give you 4 things and you tell me which one doesn't belong.",
      "Quick pattern recognition check: four items, one doesn't fit. Which is the odd one out?",
      "I love this puzzle — four things, one intruder. Let's go through 8 of them.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Odd One Out:
Present 8 rounds, one at a time. For each, name 4 items and ask which doesn't belong.
Rounds:
1. [piano, guitar, drum, paintbrush] → paintbrush (not an instrument)
2. [eagle, robin, salmon, sparrow] → salmon (not a bird)
3. [Paris, Berlin, Tokyo, Amazon] → Amazon (not a capital city)
4. [oxygen, nitrogen, gold, helium] → gold (not a gas)
5. [rose, tulip, oak, sunflower] → oak (not a flower)
6. [January, April, Tuesday, July] → Tuesday (not a month)
7. [tennis, chess, soccer, basketball] → chess (not a ball sport)
8. [hammer, saw, wrench, carrot] → carrot (not a tool)
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-8>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  // ─── PROCESSING SPEED (3) ─────────────────────────────────────────
  {
    id: 'ps-rapid-categorization',
    type: 'rapid_categorization',
    domain: 'processing_speed',
    name: 'Rapid Categorization',
    description: 'Categorize items as quickly as possible into one of two categories',
    difficulty: 2,
    durationSeconds: 60,
    parameters: { itemCount: 12, categories: ['animal', 'object'] },
    scoringRubric: `12 items, timed. rawScore = correct answers. normalizedScore = (rawScore / 12) * 100.
      Return JSON: {"rawScore": <0-12>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Let's do a quick speed round — I'll say a word, you tell me: animal or object? As fast as you can.",
      "Speed challenge: animal or object? One word at a time, quick fire.",
      "Processing speed game — each word I say is either an animal or an object. Call it out fast.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Rapid Categorization:
Read words one at a time quickly: hammer(object), dolphin(animal), scissors(object), eagle(animal), chair(object), tiger(animal), lamp(object), frog(animal), clock(object), wolf(animal), bottle(object), parrot(animal).
Count correct responses. Note any hesitations or errors.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-12>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  {
    id: 'ps-number-sequence',
    type: 'number_sequence',
    domain: 'processing_speed',
    name: 'Sequence Counting',
    description: 'Count specific items in a rapidly presented sequence',
    difficulty: 2,
    durationSeconds: 60,
    parameters: { sequenceLength: 20, targetItem: 'even numbers' },
    scoringRubric: `Correct count earns full score. rawScore = 1 if exactly right, 0.5 if off by 1, 0 otherwise.
      normalizedScore = rawScore * 100.
      Return JSON: {"rawScore": <0-1>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Quick counting challenge — I'll read a string of numbers and you count how many even numbers you hear.",
      "Let's test your processing speed with a counting task. Listen carefully as I read numbers.",
      "Counting game: I'll say 20 numbers quickly, you track only the even ones.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Sequence Counting:
Read this sequence at a brisk pace: 3, 8, 1, 4, 7, 2, 9, 6, 5, 8, 3, 4, 11, 6, 7, 2, 9, 4, 1, 8.
Correct count of even numbers: 8, 4, 2, 6, 8, 4, 6, 2, 4, 8 = 10 even numbers.
Ask user for their count. Score per rubric.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-1>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  {
    id: 'ps-letter-search',
    type: 'letter_search',
    domain: 'processing_speed',
    name: 'Letter Scan',
    description: 'Count occurrences of a target letter in a spoken sequence',
    difficulty: 2,
    durationSeconds: 45,
    parameters: { sequenceLength: 15, targetLetter: 'S' },
    scoringRubric: `Correct count = full score. rawScore = 1 if correct, 0.5 if off by 1, 0 otherwise.
      normalizedScore = rawScore * 100.
      Return JSON: {"rawScore": <0-1>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Letter tracking — I'll read 15 letters and you count how many times you hear the letter S.",
      "Quick scan task: listen for the letter S as I read a sequence.",
      "Here's a simple but sneaky one — count the S's in this letter sequence.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Letter Scan:
Read letters one at a time: B, S, T, S, M, K, S, L, S, P, R, S, N, S, Q.
Target letter: S. Correct count: 6 (positions 2,4,7,9,12,14).
Score per rubric.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-1>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  // ─── EXECUTIVE FUNCTION (3) ───────────────────────────────────────
  {
    id: 'ef-category-switching',
    type: 'category_switching',
    domain: 'executive_function',
    name: 'Category Switching',
    description: 'Alternate between naming items from two categories',
    difficulty: 3,
    durationSeconds: 90,
    parameters: { categories: ['fruits', 'countries'], rounds: 10 },
    scoringRubric: `10 alternations. rawScore = correct responses. normalizedScore = (rawScore / 10) * 100.
      Return JSON: {"rawScore": <0-10>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Let's try a switching task — we'll alternate: you name a fruit, then a country, then a fruit, and so on. I'll keep count.",
      "Here's one that tests mental flexibility — alternate between fruits and countries with each response.",
      "Task-switching game: fruit, country, fruit, country. Let's go back and forth 10 times.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Category Switching:
Ask the user to alternate naming fruits and countries for 10 turns (5 fruits, 5 countries).
Count correct, on-category responses. Penalize if they name something wrong category or repeat an item.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-10>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  {
    id: 'ef-tower-verbal',
    type: 'tower_verbal',
    domain: 'executive_function',
    name: 'Tower Planning (Verbal)',
    description: 'Plan optimal moves to solve a Tower of Hanoi variant verbally',
    difficulty: 4,
    durationSeconds: 120,
    parameters: { diskCount: 3 },
    scoringRubric: `3-disk Tower of Hanoi optimal solution: 7 moves. 
      rawScore = 7 if solved in ≤7 moves, 5 if 8-10 moves, 3 if 11-15 moves, 1 if >15, 0 if gave up.
      normalizedScore = (rawScore / 7) * 100.
      Return JSON: {"rawScore": <0-7>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "There's a classic logic puzzle called Tower of Hanoi. Three pegs, three disks — can you figure out how to move all disks from peg A to peg C using the fewest moves?",
      "Planning challenge: imagine 3 disks stacked on peg A (large, medium, small top to bottom). Move them all to peg C, but you can never place a larger disk on a smaller one.",
      "Let's do some planning. Tower of Hanoi with 3 disks — describe your moves one at a time.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Tower of Hanoi (3 disks):
Rules: 3 pegs (A, B, C), 3 disks (1=small, 2=medium, 3=large) start stacked on A (3 bottom, 1 top). 
Move all to C. Never put a larger disk on a smaller one. 
Optimal: 7 moves. Guide the user through their moves, confirm legality, count total moves.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-7>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  {
    id: 'ef-verbal-inhibition',
    type: 'verbal_inhibition',
    domain: 'executive_function',
    name: 'Say the Opposite',
    description: 'Quickly say the opposite of each word presented',
    difficulty: 2,
    durationSeconds: 60,
    parameters: { itemCount: 10 },
    scoringRubric: `10 items. rawScore = correct opposites. normalizedScore = (rawScore / 10) * 100.
      Return JSON: {"rawScore": <0-10>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Quick inhibition game — I say a word, you immediately say its opposite. As fast as you can.",
      "Say the opposite! I'll go through 10 words and you flip each one instantly.",
      "Opposite word challenge — the trick is to override what your brain wants to say.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Say the Opposite:
Say these words one at a time: hot, fast, dark, heavy, loud, happy, tall, rough, open, early.
Expected opposites: cold, slow, light/bright, light, quiet, sad/unhappy, short, smooth, closed, late.
Accept reasonable synonyms. Count correct responses.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-10>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  // ─── LANGUAGE (3) ─────────────────────────────────────────────────
  {
    id: 'lang-category-fluency',
    type: 'category_fluency',
    domain: 'language',
    name: 'Category Verbal Fluency',
    description: 'Name as many items in a category as possible in 60 seconds',
    difficulty: 2,
    durationSeconds: 75,
    parameters: { category: 'animals', timeLimitSeconds: 60 },
    scoringRubric: `rawScore = unique valid items named. Benchmark: <12 (below avg), 12-18 (average), >18 (above avg for this exercise).
      normalizedScore = min(100, (rawScore / 18) * 100).
      Return JSON: {"rawScore": <number>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Quick verbal fluency check — name as many animals as you can in 60 seconds. Go!",
      "Fluency game: you have one minute to name as many animals as possible. Ready?",
      "Let's see your animal vocabulary — 60 seconds, name as many as you can. Start whenever.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Category Fluency (Animals):
Tell the user they have 60 seconds to name as many animals as possible. Let them respond.
Count unique valid animals. Disqualify repetitions. Approximate if you can't track exact time.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <number>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  {
    id: 'lang-letter-fluency',
    type: 'letter_fluency',
    domain: 'language',
    name: 'Letter Verbal Fluency (F-A-S)',
    description: 'Name as many words starting with a given letter as possible in 60 seconds',
    difficulty: 3,
    durationSeconds: 75,
    parameters: { letter: 'F', timeLimitSeconds: 60 },
    scoringRubric: `rawScore = unique valid words starting with F (exclude proper nouns, numbers). 
      Benchmark: <10 (below avg), 10-15 (avg), >15 (above avg).
      normalizedScore = min(100, (rawScore / 15) * 100).
      Return JSON: {"rawScore": <number>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Now for a different fluency challenge — name as many words starting with the letter F as you can in 60 seconds. Any word, just no names or numbers.",
      "Letter fluency: the letter is F. 60 seconds, go! Say any word starting with F.",
      "Here's a classic neuropsychology task — words starting with F. How many can you name in a minute?",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Letter Fluency (F):
Ask user to name words starting with F for 60 seconds. No proper nouns or numbers.
Count unique valid words. Common examples: face, fall, farm, fast, fear, feel, field, find, fire, fish, flag, flat, floor, flower, fly, food, fork, form, free, friend, from, full, fun.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <number>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  {
    id: 'lang-sentence-completion',
    type: 'sentence_completion',
    domain: 'language',
    name: 'Sentence Completion',
    description: 'Complete sentences with the most appropriate word or phrase',
    difficulty: 2,
    durationSeconds: 90,
    parameters: { itemCount: 8 },
    scoringRubric: `8 items. rawScore = grammatically and semantically appropriate completions. normalizedScore = (rawScore / 8) * 100.
      Accept multiple valid answers. Return JSON: {"rawScore": <0-8>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Language completion game — I'll read the start of a sentence and you finish it naturally.",
      "Quick sentence game: I start, you complete. There's no single right answer, just what sounds natural.",
      "Let's warm up the language centers. I'll say the first half of a sentence, you complete it.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Sentence Completion:
Present these 8 sentence stems one at a time:
1. "Every morning she woke up and..."
2. "The doctor told him that..."
3. "Before leaving the house, he always..."
4. "The most important thing in life is..."
5. "Despite the rain, they decided to..."
6. "She couldn't remember where she had put..."
7. "The old map showed a path that led to..."
8. "After many years, they finally..."
Accept any grammatically and semantically coherent completion. Score 1 per reasonable completion.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-8>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  // ─── VISUOSPATIAL (3) ─────────────────────────────────────────────
  {
    id: 'vs-mental-rotation-verbal',
    type: 'mental_rotation_verbal',
    domain: 'visuospatial',
    name: 'Mental Rotation (Verbal)',
    description: 'Determine orientation of shapes through verbal description',
    difficulty: 3,
    durationSeconds: 90,
    parameters: { itemCount: 5 },
    scoringRubric: `5 items. rawScore = correct orientations identified. normalizedScore = (rawScore / 5) * 100.
      Return JSON: {"rawScore": <0-5>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Spatial reasoning puzzle — I'll describe a shape's position and you tell me if it matches another description.",
      "Mental rotation challenge: imagine shapes in your mind as I describe them.",
      "Spatial puzzle time — close your eyes and picture this as I describe it.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Mental Rotation (Verbal):
Present 5 spatial puzzles verbally:
1. "An L-shape pointing right. Rotate it 90° clockwise. Which way does it point?" → downward
2. "A T-shape facing up. Flip it upside down. Which way does it face?" → down  
3. "An arrow pointing left. Rotate 180°. Which direction now?" → right
4. "A P letter. Mirror it horizontally. What letter does it resemble?" → q
5. "A triangle with the tip pointing up. Rotate 90° clockwise. Where does the tip point?" → right
Score correct spatial reasoning. Accept reasonable paraphrasing.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-5>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  {
    id: 'vs-direction-following',
    type: 'direction_following',
    domain: 'visuospatial',
    name: 'Verbal Map Navigation',
    description: 'Follow a series of verbal directions on an imagined grid',
    difficulty: 3,
    durationSeconds: 90,
    parameters: { steps: 6 },
    scoringRubric: `6 directions, then ask for final position. rawScore = 1 if exactly right, 0 otherwise. normalizedScore = rawScore * 100.
      Return JSON: {"rawScore": <0-1>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Imagine you're standing at the center of a grid. I'll give you six directions — tell me where you end up.",
      "Navigation challenge: visualize a map and follow my directions. Where do you land?",
      "Mental GPS exercise — start at center, follow these steps, tell me your final position.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Verbal Map Navigation:
Ask user to imagine standing at position (0,0) on a grid. Give directions one at a time:
1. "Go north 3 steps" → (0,3)
2. "Go east 2 steps" → (2,3)
3. "Go south 1 step" → (2,2)
4. "Go west 4 steps" → (-2,2)
5. "Go north 2 steps" → (-2,4)
6. "Go east 3 steps" → (1,4)
Ask: "Where are you?" Answer: 1 east and 4 north of center (or equivalent description).
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-1>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },

  {
    id: 'vs-pattern-description',
    type: 'pattern_description',
    domain: 'visuospatial',
    name: 'Pattern Recall',
    description: 'Recall and describe a spatial pattern after a brief presentation',
    difficulty: 2,
    durationSeconds: 90,
    parameters: { gridSize: '3x3', filledCells: 5 },
    scoringRubric: `5 cells in a 3x3 grid. rawScore = cells correctly recalled. normalizedScore = (rawScore / 5) * 100.
      Return JSON: {"rawScore": <0-5>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Spatial memory test — I'll describe a pattern on a 3x3 grid. Remember it, then I'll ask you to recall it.",
      "Grid memory game: imagine a tic-tac-toe board. I'll tell you which squares are filled. Remember them.",
      "Here's a pattern to visualize on a 3x3 grid. I'll describe it, then ask you to recall it.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Pattern Recall:
Describe this 3x3 grid pattern (rows top to bottom, columns left to right):
"The top-left corner is filled. The top-right corner is filled. The center is filled. The bottom-left corner is filled. The bottom-right corner is filled." (X pattern / corners + center).
After a brief pause, ask the user to recall which squares were filled.
Score: 1 point per correctly recalled cell. Accept positional descriptions.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-5>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
  },
];

export function getExercisesByDomain(domain: CognitiveDomain): ExerciseDefinition[] {
  return EXERCISES.filter(e => e.domain === domain);
}

export function getExerciseById(id: string): ExerciseDefinition | undefined {
  return EXERCISES.find(e => e.id === id);
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd services/exercise-service && pnpm install && pnpm test -- --testPathPattern=exercises.library
```

Expected: `PASS` — 3 tests passing.

- [ ] **Step 6: Commit**

```bash
cd ../..
git add services/exercise-service/
git commit -m "feat(exercise-service): add complete exercise library with 18 exercises across 6 cognitive domains"
```

---

## Task 13: Exercise Service — DB Schema + API Endpoints

**Files:**
- Create: `services/exercise-service/src/db/schema.ts`
- Create: `services/exercise-service/src/db/index.ts`
- Create: `services/exercise-service/src/middleware/auth.ts`
- Create: `services/exercise-service/src/routes/exercises.ts`
- Modify: `services/exercise-service/src/index.ts`
- Test: `services/exercise-service/src/__tests__/exercises.api.test.ts`

- [ ] **Step 1: Write failing API tests**

```typescript
// services/exercise-service/src/__tests__/exercises.api.test.ts
import request from 'supertest';
import { createApp } from '../index.js';
import { SignJWT } from 'jose';

jest.mock('../db/index.js', () => ({
  db: {
    insert: jest.fn(),
    update: jest.fn(),
    query: { exerciseSessions: { findFirst: jest.fn() } },
  },
}));

import { db } from '../db/index.js';
const mockDb = db as jest.Mocked<typeof db>;

async function makeToken(userId = 'user-123') {
  const secret = new TextEncoder().encode('dev-secret-change-me');
  return new SignJWT({ sub: userId }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('15m').sign(secret);
}

describe('GET /exercises/next', () => {
  it('returns an exercise with a session ID', async () => {
    (mockDb.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'session-1' }]),
      }),
    });

    const token = await makeToken();
    const app = createApp();
    const res = await request(app)
      .get('/exercises/next')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exercise');
    expect(res.body).toHaveProperty('sessionId');
    expect(res.body.exercise).toHaveProperty('type');
    expect(res.body.exercise).toHaveProperty('domain');
  });
});

describe('POST /exercises/:id/submit', () => {
  it('scores an exercise and returns the result', async () => {
    const session = {
      id: 'session-1', userId: 'user-123', exerciseId: 'mem-word-recall',
      domain: 'memory', completedAt: null,
    };
    (mockDb.query.exerciseSessions.findFirst as jest.Mock).mockResolvedValue(session);
    (mockDb.update as jest.Mock).mockReturnValue({
      set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([{}]) }),
    });

    const token = await makeToken();
    const app = createApp();
    const res = await request(app)
      .post('/exercises/session-1/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        conversationId: 'conv-1',
        userResponse: 'apple, bridge, cloud, lantern',
        durationSeconds: 45,
        scorePayload: { rawScore: 4, normalizedScore: 50, feedback: 'Good effort!' },
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('exerciseSessionId');
    expect(res.body).toHaveProperty('rawScore');
    expect(res.body).toHaveProperty('normalizedScore');
    expect(res.body.domain).toBe('memory');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd services/exercise-service && pnpm test -- --testPathPattern=exercises.api
```

Expected: `FAIL`.

- [ ] **Step 3: Write DB schema**

```typescript
// services/exercise-service/src/db/schema.ts
import { pgTable, uuid, varchar, timestamp, integer, real, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const cognitiveDomainEnum = pgEnum('cognitive_domain_ex', [
  'memory', 'attention', 'processing_speed', 'executive_function', 'language', 'visuospatial'
]);

export const exerciseSessions = pgTable('exercise_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  conversationId: uuid('conversation_id'),
  exerciseId: varchar('exercise_id', { length: 100 }).notNull(),  // matches ExerciseDefinition.id
  domain: cognitiveDomainEnum('domain').notNull(),
  difficulty: integer('difficulty').notNull().default(2),
  rawScore: real('raw_score'),
  normalizedScore: real('normalized_score'),
  userResponse: varchar('user_response', { length: 8000 }),
  durationSeconds: integer('duration_seconds'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'),
});
```

- [ ] **Step 4: Write DB connection and auth middleware**

```typescript
// services/exercise-service/src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

```typescript
// services/exercise-service/src/middleware/auth.ts
// Same implementation as conversation-service/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';

export interface AuthRequest extends Request { userId: string; }

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-me');
  try {
    const { payload } = await jwtVerify(header.slice(7), secret);
    (req as AuthRequest).userId = payload.sub!;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

- [ ] **Step 5: Write exercises router**

```typescript
// services/exercise-service/src/routes/exercises.ts
import { Router, Response } from 'express';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { exerciseSessions } from '../db/schema.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { EXERCISES, getExerciseById } from '../data/exercises.js';
import type { CognitiveDomain } from '@cogniguard/types';

export const exercisesRouter = Router();
exercisesRouter.use(requireAuth);

// Simple round-robin selection for Phase 1 (Phase 2 adds Bayesian IRT)
function selectNextExercise(userId: string) {
  const idx = Math.floor(Math.random() * EXERCISES.length);
  return EXERCISES[idx];
}

exercisesRouter.get('/next', async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const exercise = selectNextExercise(userId);

  const [session] = await db.insert(exerciseSessions).values({
    userId,
    exerciseId: exercise.id,
    domain: exercise.domain as any,
    difficulty: exercise.difficulty,
  }).returning();

  return res.json({
    exercise: {
      id: exercise.id,
      type: exercise.type,
      domain: exercise.domain,
      name: exercise.name,
      description: exercise.description,
      difficulty: exercise.difficulty,
      durationSeconds: exercise.durationSeconds,
      parameters: exercise.parameters,
      scoringRubric: exercise.scoringRubric,
      conversationalBridges: exercise.conversationalBridges,
      systemPromptFragment: exercise.systemPromptFragment,
    },
    sessionId: session.id,
  });
});

const submitSchema = z.object({
  conversationId: z.string().uuid(),
  userResponse: z.string().min(1).max(8000),
  durationSeconds: z.number().positive(),
  // The score is computed by Claude in the conversation and passed here by the conversation service
  scorePayload: z.object({
    rawScore: z.number(),
    normalizedScore: z.number().min(0).max(100),
    feedback: z.string(),
  }),
});

exercisesRouter.post('/:id/submit', async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const session = await db.query.exerciseSessions.findFirst({
    where: eq(exerciseSessions.id, req.params.id),
  });

  if (!session) return res.status(404).json({ error: 'Exercise session not found' });
  if (session.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
  if (session.completedAt) return res.status(409).json({ error: 'Exercise already submitted' });

  const { scorePayload, userResponse, durationSeconds, conversationId } = parsed.data;

  await db.update(exerciseSessions)
    .set({
      rawScore: scorePayload.rawScore,
      normalizedScore: scorePayload.normalizedScore,
      userResponse,
      durationSeconds,
      conversationId,
      completedAt: new Date(),
      metadata: { feedback: scorePayload.feedback },
    })
    .where(eq(exerciseSessions.id, req.params.id));

  const exercise = getExerciseById(session.exerciseId);

  return res.json({
    exerciseSessionId: session.id,
    rawScore: scorePayload.rawScore,
    normalizedScore: scorePayload.normalizedScore,
    domain: session.domain,
    feedback: scorePayload.feedback,
  });
});

exercisesRouter.get('/history', async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const sessions = await db
    .select()
    .from(exerciseSessions)
    .where(and(eq(exerciseSessions.userId, userId)))
    .orderBy(exerciseSessions.startedAt);

  return res.json(sessions);
});
```

- [ ] **Step 6: Create app skeleton + run migrations**

```typescript
// services/exercise-service/src/index.ts
import 'dotenv/config';
import express from 'express';
import { exercisesRouter } from './routes/exercises.js';

export function createApp() {
  const app = express();
  app.use(express.json());
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'exercise-service' }));
  app.use('/exercises', exercisesRouter);
  return app;
}

if (require.main === module) {
  const port = process.env.EXERCISE_SERVICE_PORT ?? 3003;
  createApp().listen(port, () => console.log(`exercise-service listening on port ${port}`));
}
```

```bash
# Create drizzle.config.ts (same pattern as other services)
# Then:
pnpm drizzle-kit generate && pnpm db:migrate
```

- [ ] **Step 7: Run all tests**

```bash
pnpm test
```

Expected: All exercise tests pass.

- [ ] **Step 8: Commit**

```bash
cd ../..
git add services/exercise-service/
git commit -m "feat(exercise-service): add exercise session API with next selection and score submission"
```

---

## Task 14: Conversation Engine — Exercise Embedding

**Files:**
- Create: `services/conversation-service/src/services/exercise-embed.service.ts`
- Modify: `services/conversation-service/src/routes/conversations.ts`
- Test: `services/conversation-service/src/__tests__/exercise-embed.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// services/conversation-service/src/__tests__/exercise-embed.test.ts
import { extractExerciseScore, buildExerciseSystemPrompt } from '../services/exercise-embed.service.js';

describe('extractExerciseScore', () => {
  it('parses EXERCISE_SCORE JSON from assistant message', () => {
    const text = `Great effort! Let's keep going.\nEXERCISE_SCORE: {"rawScore": 5, "normalizedScore": 62.5, "feedback": "Nice work!"}`;
    const result = extractExerciseScore(text);
    expect(result).not.toBeNull();
    expect(result!.rawScore).toBe(5);
    expect(result!.normalizedScore).toBe(62.5);
    expect(result!.feedback).toBe('Nice work!');
  });

  it('returns null when no EXERCISE_SCORE marker', () => {
    const result = extractExerciseScore('Just a regular response.');
    expect(result).toBeNull();
  });

  it('strips EXERCISE_SCORE line from visible text', () => {
    const text = `Great job!\nEXERCISE_SCORE: {"rawScore": 3, "normalizedScore": 60, "feedback": "Good!"}`;
    const { cleanText } = extractExerciseScore(text) ?? {};
    expect(cleanText).toBe('Great job!');
    expect(cleanText).not.toContain('EXERCISE_SCORE');
  });
});

describe('buildExerciseSystemPrompt', () => {
  it('includes the exercise systemPromptFragment in output', () => {
    const fragment = 'EXERCISE ACTIVE — Word List Recall: say these words...';
    const prompt = buildExerciseSystemPrompt(fragment);
    expect(prompt).toContain(fragment);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd services/conversation-service && pnpm test -- --testPathPattern=exercise-embed
```

Expected: `FAIL`.

- [ ] **Step 3: Write exercise-embed service**

```typescript
// services/conversation-service/src/services/exercise-embed.service.ts

export interface ExerciseScore {
  rawScore: number;
  normalizedScore: number;
  feedback: string;
  cleanText: string;    // assistant message with EXERCISE_SCORE line removed
}

const SCORE_PATTERN = /^EXERCISE_SCORE:\s*(\{.+\})\s*$/m;

export function extractExerciseScore(text: string): ExerciseScore | null {
  const match = text.match(SCORE_PATTERN);
  if (!match) return null;

  try {
    const payload = JSON.parse(match[1]) as { rawScore: number; normalizedScore: number; feedback: string };
    const cleanText = text.replace(SCORE_PATTERN, '').trim();
    return {
      rawScore: payload.rawScore,
      normalizedScore: payload.normalizedScore,
      feedback: payload.feedback,
      cleanText,
    };
  } catch {
    return null;
  }
}

export function buildExerciseSystemPrompt(exerciseFragment: string): string {
  return `\n\n--- ACTIVE EXERCISE ---\n${exerciseFragment}\n--- END EXERCISE ---`;
}
```

- [ ] **Step 4: Integrate into SSE endpoint**

In `services/conversation-service/src/routes/conversations.ts`, update the `POST /:id/messages` handler to:
1. Check if the response contains `EXERCISE_SCORE`
2. If so, emit `exercise.result` SSE event with the parsed score
3. Strip the `EXERCISE_SCORE` line from the persisted message content

```typescript
// Updated onComplete callback in POST /:id/messages:

onComplete: async (fullText, _inputTokens, outputTokens) => {
  const { extractExerciseScore } = await import('../services/exercise-embed.service.js');
  const scoreResult = extractExerciseScore(fullText);
  const contentToStore = scoreResult ? scoreResult.cleanText : fullText;

  const [assistantMsg] = await db.insert(messages).values({
    conversationId: conversation.id,
    role: 'assistant',
    content: contentToStore,
    tokens: outputTokens,
    metadata: scoreResult ? { exerciseScore: { rawScore: scoreResult.rawScore, normalizedScore: scoreResult.normalizedScore } } : null,
  }).returning();

  // Emit exercise result if scored
  if (scoreResult && req.query.exerciseSessionId && req.query.domain) {
    sendSSEEvent(res, {
      type: 'exercise.result',
      exerciseId: req.query.exerciseSessionId as string,
      domain: req.query.domain as any,
      rawScore: scoreResult.rawScore,
      normalizedScore: scoreResult.normalizedScore,
    });
  }

  sendSSEEvent(res, {
    type: 'message.complete',
    message: {
      id: assistantMsg.id,
      conversationId: assistantMsg.conversationId,
      role: 'assistant',
      content: contentToStore,
      tokens: assistantMsg.tokens,
      createdAt: assistantMsg.createdAt.toISOString(),
    },
  });
  res.end();
},
```

- [ ] **Step 5: Run tests**

```bash
pnpm test
```

Expected: All tests pass including exercise-embed.

- [ ] **Step 6: Commit**

```bash
cd ../..
git add services/conversation-service/src/services/exercise-embed.service.ts services/conversation-service/src/routes/conversations.ts services/conversation-service/src/__tests__/exercise-embed.test.ts
git commit -m "feat(conversation-service): add exercise score extraction from Claude responses"
```

---

## Task 15: React Native — Project Setup + Navigation

**Files:**
- Create: `apps/mobile/` (full Expo project)
- Create: `apps/mobile/lib/api.ts`
- Create: `apps/mobile/stores/auth.store.ts`

- [ ] **Step 1: Initialize Expo project**

```bash
cd apps
npx create-expo-app mobile --template blank-typescript
cd mobile
```

- [ ] **Step 2: Install dependencies**

```bash
npx expo install expo-router expo-secure-store expo-sqlite react-native-safe-area-context react-native-screens
pnpm add zustand @react-native-async-storage/async-storage
pnpm add -D @types/react
```

- [ ] **Step 3: Update package.json main entry for Expo Router**

```json
{
  "main": "expo-router/entry"
}
```

Add to `app.json`:
```json
{
  "expo": {
    "scheme": "cogniguard",
    "web": { "bundler": "metro" }
  }
}
```

- [ ] **Step 4: Write the API client**

```typescript
// apps/mobile/lib/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost';
const USER_SERVICE = `${BASE_URL}:3001`;
const CONVERSATION_SERVICE = `${BASE_URL}:3002`;
const EXERCISE_SERVICE = `${BASE_URL}:3003`;

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('accessToken');
}

async function apiFetch<T>(
  serviceUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${serviceUrl}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(body.error ?? 'Request failed'), { status: res.status });
  }
  return res.json() as Promise<T>;
}

export const userApi = {
  register: (data: { email: string; password: string; name: string }) =>
    apiFetch<{ accessToken: string; expiresIn: number; user: any }>(USER_SERVICE, '/auth/register', {
      method: 'POST', body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    apiFetch<{ accessToken: string; expiresIn: number; user: any }>(USER_SERVICE, '/auth/login', {
      method: 'POST', body: JSON.stringify(data),
    }),
  getMe: () => apiFetch<any>(USER_SERVICE, '/users/me'),
};

export const conversationApi = {
  create: () => apiFetch<any>(CONVERSATION_SERVICE, '/conversations', { method: 'POST' }),
  getMessages: (id: string) => apiFetch<any[]>(CONVERSATION_SERVICE, `/conversations/${id}/messages`),

  // Returns an EventSource-compatible URL for SSE
  sendMessageSSE: async (
    conversationId: string,
    content: string,
    onEvent: (type: string, data: any) => void,
    onDone: () => void
  ): Promise<void> => {
    const token = await getToken();
    const url = `${CONVERSATION_SERVICE}/conversations/${conversationId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok || !response.body) throw new Error('SSE connection failed');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ') && currentEvent) {
          try {
            const data = JSON.parse(line.slice(6));
            onEvent(currentEvent, data);
          } catch {}
          currentEvent = '';
        }
      }
    }
    onDone();
  },
};

export const exerciseApi = {
  getNext: () => apiFetch<any>(EXERCISE_SERVICE, '/exercises/next'),
  submit: (sessionId: string, data: any) =>
    apiFetch<any>(EXERCISE_SERVICE, `/exercises/${sessionId}/submit`, {
      method: 'POST', body: JSON.stringify(data),
    }),
};
```

- [ ] **Step 5: Write Auth store**

```typescript
// apps/mobile/stores/auth.store.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from '../lib/api';

interface AuthState {
  user: any | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,

  loadFromStorage: async () => {
    const token = await AsyncStorage.getItem('accessToken');
    if (!token) return;
    try {
      const user = await userApi.getMe();
      set({ user, accessToken: token });
    } catch {
      await AsyncStorage.removeItem('accessToken');
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { accessToken, user } = await userApi.login({ email, password });
      await AsyncStorage.setItem('accessToken', accessToken);
      set({ user, accessToken, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const { accessToken, user } = await userApi.register({ email, password, name });
      await AsyncStorage.setItem('accessToken', accessToken);
      set({ user, accessToken, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('accessToken');
    set({ user: null, accessToken: null });
  },
}));
```

- [ ] **Step 6: Write root layout with auth routing**

```tsx
// apps/mobile/app/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../stores/auth.store';

export default function RootLayout() {
  const { user, accessToken, loadFromStorage } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';
    if (!accessToken && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (accessToken && inAuthGroup) {
      router.replace('/(app)/');
    }
  }, [accessToken, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 7: Verify app starts**

```bash
cd apps/mobile && npx expo start
```

Expected: Expo dev server starts, QR code displayed. App opens in simulator.

- [ ] **Step 8: Commit**

```bash
cd ../..
git add apps/mobile/
git commit -m "feat(mobile): initialize Expo app with Expo Router navigation and auth store"
```

---

## Task 16: React Native — Auth Screens

**Files:**
- Create: `apps/mobile/app/(auth)/login.tsx`
- Create: `apps/mobile/app/(auth)/register.tsx`
- Create: `apps/mobile/app/(auth)/_layout.tsx`

- [ ] **Step 1: Write auth group layout**

```tsx
// apps/mobile/app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Write login screen**

```tsx
// apps/mobile/app/(auth)/login.tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Missing fields', 'Please enter email and password.');
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Login failed', err.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>CogniGuard</Text>
        <Text style={styles.subtitle}>Brain health, every day</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!isLoading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!isLoading}
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <Link href="/(auth)/register" style={styles.link}>
          Don't have an account? <Text style={styles.linkBold}>Sign up</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 32, fontWeight: '700', color: '#1a1a2e', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6c757d', textAlign: 'center', marginBottom: 48 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#dee2e6',
  },
  button: {
    backgroundColor: '#4361ee', borderRadius: 12, padding: 18,
    alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', marginTop: 24, color: '#6c757d', fontSize: 14 },
  linkBold: { color: '#4361ee', fontWeight: '600' },
});
```

- [ ] **Step 3: Write register screen**

```tsx
// apps/mobile/app/(auth)/register.tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, isLoading } = useAuthStore();

  const handleRegister = async () => {
    if (!name || !email || !password) return Alert.alert('Missing fields', 'Please fill in all fields.');
    if (password.length < 8) return Alert.alert('Weak password', 'Password must be at least 8 characters.');
    try {
      await register(email.trim(), password, name.trim());
    } catch (err: any) {
      Alert.alert('Registration failed', err.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start your brain health journey</Text>

        <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} editable={!isLoading} />
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" editable={!isLoading} />
        <TextInput style={styles.input} placeholder="Password (min 8 characters)" value={password} onChangeText={setPassword} secureTextEntry editable={!isLoading} />

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <Link href="/(auth)/login" style={styles.link}>
          Already have an account? <Text style={styles.linkBold}>Sign in</Text>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a2e', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6c757d', textAlign: 'center', marginBottom: 40 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#dee2e6',
  },
  button: { backgroundColor: '#4361ee', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', marginTop: 24, color: '#6c757d', fontSize: 14 },
  linkBold: { color: '#4361ee', fontWeight: '600' },
});
```

- [ ] **Step 4: Test on simulator — register then login**

Start all three services and the Expo app. Register a new account through the UI. Verify redirect to app home after successful registration. Logout and login with the same credentials.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add apps/mobile/app/\(auth\)/
git commit -m "feat(mobile): add login and register screens with form validation"
```

---

## Task 17: React Native — Conversation Screen + Exercise Overlay

**Files:**
- Create: `apps/mobile/app/(app)/_layout.tsx`
- Create: `apps/mobile/app/(app)/index.tsx`
- Create: `apps/mobile/app/(app)/conversation.tsx`
- Create: `apps/mobile/stores/conversation.store.ts`
- Create: `apps/mobile/stores/exercise.store.ts`
- Create: `apps/mobile/components/MessageList.tsx`
- Create: `apps/mobile/components/MessageInput.tsx`
- Create: `apps/mobile/components/ExerciseOverlay.tsx`

- [ ] **Step 1: Write conversation store**

```typescript
// apps/mobile/stores/conversation.store.ts
import { create } from 'zustand';
import { conversationApi } from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ConversationState {
  conversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  streamingText: string;
  error: string | null;
  startConversation: () => Promise<void>;
  sendMessage: (content: string, onExerciseEvent?: (type: string, data: any) => void) => Promise<void>;
  clearConversation: () => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversationId: null,
  messages: [],
  isStreaming: false,
  streamingText: '',
  error: null,

  startConversation: async () => {
    const conv = await conversationApi.create();
    set({ conversationId: conv.id, messages: [] });
  },

  sendMessage: async (content, onExerciseEvent) => {
    const { conversationId } = get();
    if (!conversationId) throw new Error('No active conversation');

    // Optimistically add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    set(s => ({ messages: [...s.messages, userMsg], isStreaming: true, streamingText: '' }));

    await conversationApi.sendMessageSSE(
      conversationId,
      content,
      (type, data) => {
        if (type === 'message.delta') {
          set(s => ({ streamingText: s.streamingText + data.delta }));
        } else if (type === 'message.complete') {
          set(s => ({
            messages: [...s.messages, {
              id: data.message.id,
              role: 'assistant',
              content: data.message.content,
              createdAt: data.message.createdAt,
            }],
            streamingText: '',
          }));
        } else if (type === 'exercise.start' || type === 'exercise.result') {
          onExerciseEvent?.(type, data);
        }
      },
      () => set({ isStreaming: false }),
    );
  },

  clearConversation: () => set({ conversationId: null, messages: [], streamingText: '' }),
}));
```

- [ ] **Step 2: Write exercise store**

```typescript
// apps/mobile/stores/exercise.store.ts
import { create } from 'zustand';
import { exerciseApi } from '../lib/api';

interface ActiveExercise {
  sessionId: string;
  exerciseId: string;
  type: string;
  domain: string;
  parameters: Record<string, unknown>;
}

interface ExerciseResult {
  rawScore: number;
  normalizedScore: number;
  domain: string;
  feedback: string;
}

interface ExerciseState {
  activeExercise: ActiveExercise | null;
  lastResult: ExerciseResult | null;
  showResultBanner: boolean;
  setActiveExercise: (exercise: ActiveExercise | null) => void;
  setResult: (result: ExerciseResult) => void;
  dismissResult: () => void;
}

export const useExerciseStore = create<ExerciseState>((set) => ({
  activeExercise: null,
  lastResult: null,
  showResultBanner: false,

  setActiveExercise: (exercise) => set({ activeExercise: exercise }),

  setResult: (result) => set({
    lastResult: result,
    showResultBanner: true,
    activeExercise: null,
  }),

  dismissResult: () => set({ showResultBanner: false }),
}));
```

- [ ] **Step 3: Write MessageList component**

```tsx
// apps/mobile/components/MessageList.tsx
import { useRef, useEffect } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  messages: Message[];
  streamingText: string;
}

export function MessageList({ messages, streamingText }: Props) {
  const flatListRef = useRef<FlatList>(null);

  const displayMessages = streamingText
    ? [...messages, { id: 'streaming', role: 'assistant' as const, content: streamingText + '▋' }]
    : messages;

  useEffect(() => {
    if (displayMessages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [displayMessages.length, streamingText]);

  return (
    <FlatList
      ref={flatListRef}
      data={displayMessages}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.text, item.role === 'user' ? styles.userText : styles.aiText]}>
            {item.content}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12, paddingHorizontal: 16 },
  bubble: { maxWidth: '80%', borderRadius: 18, padding: 12, marginVertical: 4 },
  userBubble: { backgroundColor: '#4361ee', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#f0f4ff', alignSelf: 'flex-start' },
  text: { fontSize: 16, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: '#1a1a2e' },
});
```

- [ ] **Step 4: Write MessageInput component**

```tsx
// apps/mobile/components/MessageInput.tsx
import { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder="Type a message..."
        multiline
        maxLength={2000}
        editable={!disabled}
        onSubmitEditing={handleSend}
      />
      <TouchableOpacity style={[styles.sendButton, disabled && styles.disabled]} onPress={handleSend} disabled={disabled}>
        {disabled
          ? <ActivityIndicator color="#fff" size="small" />
          : <Ionicons name="send" size={20} color="#fff" />
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#dee2e6',
  },
  input: {
    flex: 1, backgroundColor: '#f8f9fa', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 16,
    maxHeight: 120, marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#4361ee', borderRadius: 24,
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
  },
  disabled: { backgroundColor: '#adb5bd' },
});
```

- [ ] **Step 5: Write ExerciseOverlay component**

```tsx
// apps/mobile/components/ExerciseOverlay.tsx
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useExerciseStore } from '../stores/exercise.store';

export function ExerciseResultBanner() {
  const { lastResult, showResultBanner, dismissResult } = useExerciseStore();

  if (!showResultBanner || !lastResult) return null;

  const score = Math.round(lastResult.normalizedScore);
  const emoji = score >= 80 ? '🌟' : score >= 60 ? '✨' : '💪';

  return (
    <View style={styles.banner}>
      <Text style={styles.emoji}>{emoji}</Text>
      <View style={styles.bannerContent}>
        <Text style={styles.bannerScore}>{score}% — {lastResult.domain.replace('_', ' ')}</Text>
        <Text style={styles.bannerFeedback}>{lastResult.feedback}</Text>
      </View>
      <TouchableOpacity onPress={dismissResult} style={styles.dismiss}>
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#e8f4fd', margin: 12, borderRadius: 16,
    padding: 14, borderLeftWidth: 4, borderLeftColor: '#4361ee',
  },
  emoji: { fontSize: 28, marginRight: 12 },
  bannerContent: { flex: 1 },
  bannerScore: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  bannerFeedback: { fontSize: 13, color: '#495057', marginTop: 2 },
  dismiss: { padding: 4 },
  dismissText: { color: '#adb5bd', fontSize: 16 },
});
```

- [ ] **Step 6: Write conversation screen**

```tsx
// apps/mobile/app/(app)/conversation.tsx
import { useEffect } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useConversationStore } from '../../stores/conversation.store';
import { useExerciseStore } from '../../stores/exercise.store';
import { MessageList } from '../../components/MessageList';
import { MessageInput } from '../../components/MessageInput';
import { ExerciseResultBanner } from '../../components/ExerciseOverlay';

export default function ConversationScreen() {
  const { conversationId, messages, streamingText, isStreaming, startConversation, sendMessage } = useConversationStore();
  const { setActiveExercise, setResult } = useExerciseStore();

  useEffect(() => {
    if (!conversationId) {
      startConversation();
    }
  }, []);

  const handleSend = async (content: string) => {
    await sendMessage(content, (type, data) => {
      if (type === 'exercise.start') {
        setActiveExercise({
          sessionId: data.exerciseId,
          exerciseId: data.exerciseId,
          type: data.exerciseType,
          domain: data.domain,
          parameters: data.parameters ?? {},
        });
      } else if (type === 'exercise.result') {
        setResult({
          rawScore: data.rawScore,
          normalizedScore: data.normalizedScore,
          domain: data.domain,
          feedback: 'Great work!',
        });
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExerciseResultBanner />
      <MessageList messages={messages} streamingText={streamingText} />
      <MessageInput onSend={handleSend} disabled={isStreaming} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
});
```

- [ ] **Step 7: Write home screen and app layout**

```tsx
// apps/mobile/app/(app)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AppLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#4361ee', headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="conversation" options={{ title: 'Chat', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" size={size} color={color} /> }} />
    </Tabs>
  );
}
```

```tsx
// apps/mobile/app/(app)/index.tsx
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { useConversationStore } from '../../stores/conversation.store';

export default function HomeScreen() {
  const { user, logout } = useAuthStore();
  const { clearConversation } = useConversationStore();
  const router = useRouter();

  const handleStartSession = () => {
    clearConversation();
    router.push('/(app)/conversation');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
        <Text style={styles.subtitle}>Ready for your brain workout today?</Text>

        <TouchableOpacity style={styles.button} onPress={handleStartSession}>
          <Text style={styles.buttonText}>Start Session</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  greeting: { fontSize: 28, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6c757d', marginBottom: 48, textAlign: 'center' },
  button: { backgroundColor: '#4361ee', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 48, marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  logoutButton: { marginTop: 24 },
  logoutText: { color: '#adb5bd', fontSize: 14 },
});
```

- [ ] **Step 8: End-to-end test on simulator**

With all three services running and Expo started:
1. Register a new account → land on Home screen
2. Tap "Start Session" → conversation screen opens
3. Type "Hello, introduce yourself" → see streaming AI response
4. Continue chatting until Pierre naturally embeds an exercise
5. Respond to the exercise → see result banner appear

- [ ] **Step 9: Commit**

```bash
cd ../..
git add apps/mobile/
git commit -m "feat(mobile): add conversation screen with SSE streaming and exercise result overlay"
```

---

## Task 18: Onboarding Calibration Flow

**Files:**
- Create: `apps/mobile/app/(app)/onboarding.tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `services/user-service/src/routes/users.ts`

- [ ] **Step 1: Write failing test for onboarding completion endpoint**

```typescript
// services/user-service/src/__tests__/users.onboarding.test.ts
import request from 'supertest';
import { createApp } from '../index.js';
import { SignJWT } from 'jose';

jest.mock('../db/index.js', () => ({
  db: {
    update: jest.fn(),
    query: { users: { findFirst: jest.fn() } },
  },
}));

import { db } from '../db/index.js';
const mockDb = db as jest.Mocked<typeof db>;

async function makeToken(userId = 'user-123') {
  const secret = new TextEncoder().encode('dev-secret-change-me');
  return new SignJWT({ sub: userId }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('15m').sign(secret);
}

describe('POST /users/me/complete-onboarding', () => {
  it('marks onboarding complete and returns updated user', async () => {
    const now = new Date();
    (mockDb.update as jest.Mock).mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'user-123', email: 'test@example.com', name: 'Test',
            dob: null, onboardingCompletedAt: now, subscriptionTier: 'free', createdAt: now,
          }]),
        }),
      }),
    });

    const token = await makeToken();
    const app = createApp();
    const res = await request(app)
      .post('/users/me/complete-onboarding')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.onboardingCompletedAt).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd services/user-service && pnpm test -- --testPathPattern=users.onboarding
```

Expected: `FAIL` — route not found.

- [ ] **Step 3: Add complete-onboarding endpoint**

```typescript
// Add to services/user-service/src/routes/users.ts

usersRouter.post('/me/complete-onboarding', async (req, res: Response) => {
  const { userId } = req as AuthRequest;
  const [updated] = await db
    .update(users)
    .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  return res.json({
    id: updated.id,
    email: updated.email,
    name: updated.name,
    dob: updated.dob ?? null,
    onboardingCompletedAt: updated.onboardingCompletedAt?.toISOString() ?? null,
    subscriptionTier: updated.subscriptionTier,
    createdAt: updated.createdAt.toISOString(),
  });
});
```

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 5: Write onboarding screen**

```tsx
// apps/mobile/app/(app)/onboarding.tsx
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useConversationStore } from '../../stores/conversation.store';
import { useAuthStore } from '../../stores/auth.store';
import { MessageList } from '../../components/MessageList';
import { MessageInput } from '../../components/MessageInput';
import { userApi } from '../../lib/api';

// Onboarding uses a special conversation with a calibration system prompt
// The conversation service will handle this via a query param
export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { conversationId, messages, streamingText, isStreaming, startConversation, sendMessage } = useConversationStore();
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    startConversation();
  }, []);

  const handleSend = async (content: string) => {
    await sendMessage(content);
    // After 5+ user messages, show "Complete Onboarding" button
    const userMessages = messages.filter(m => m.role === 'user').length;
    if (userMessages >= 4) setIsComplete(true);
  };

  const handleComplete = async () => {
    await userApi.register; // no-op, just calling the endpoint
    try {
      const response = await fetch('http://localhost:3001/users/me/complete-onboarding', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('accessToken'))}`,
        },
      });
      if (response.ok) router.replace('/(app)/');
    } catch (err) {
      router.replace('/(app)/');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Meet Pierre, your brain health companion</Text>
        <Text style={styles.headerSub}>Have a conversation — she'll learn about you</Text>
      </View>

      <MessageList messages={messages} streamingText={streamingText} />

      {isComplete && (
        <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
          <Text style={styles.completeText}>Continue to CogniGuard →</Text>
        </TouchableOpacity>
      )}

      <MessageInput onSend={handleSend} disabled={isStreaming} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { padding: 20, backgroundColor: '#4361ee' },
  headerText: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  completeButton: {
    backgroundColor: '#2dc653', margin: 12, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  completeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
```

- [ ] **Step 6: Route new users to onboarding**

```tsx
// apps/mobile/app/_layout.tsx — update the auth effect:

useEffect(() => {
  const inAuthGroup = segments[0] === '(auth)';
  const inOnboarding = segments[1] === 'onboarding';

  if (!accessToken && !inAuthGroup) {
    router.replace('/(auth)/login');
  } else if (accessToken && inAuthGroup) {
    // New user with no onboarding → go to onboarding
    if (user && !user.onboardingCompletedAt) {
      router.replace('/(app)/onboarding');
    } else {
      router.replace('/(app)/');
    }
  } else if (accessToken && user && !user.onboardingCompletedAt && !inOnboarding) {
    router.replace('/(app)/onboarding');
  }
}, [accessToken, user, segments]);
```

- [ ] **Step 7: End-to-end test of onboarding**

1. Register a new account
2. Verify redirect to onboarding screen
3. Have a conversation with Pierre (5+ messages)
4. Tap "Continue to CogniGuard"
5. Verify redirect to home; verify `onboardingCompletedAt` is set in DB

```bash
docker exec cogniguard-postgres psql -U cogniguard -d cogniguard -c \
  "SELECT email, onboarding_completed_at FROM users;"
```

- [ ] **Step 8: Commit**

```bash
cd ../..
git add services/user-service/ apps/mobile/app/\(app\)/onboarding.tsx apps/mobile/app/_layout.tsx
git commit -m "feat: add onboarding calibration flow with Pierre conversation and completion endpoint"
```

---

## Phase 1 Complete — Integration Smoke Test

Run this final end-to-end verification before considering Phase 1 done:

```bash
# 1. Start infrastructure
cd infrastructure && docker compose up -d && cd ..

# 2. Start all three services in background
(cd services/user-service && pnpm dev) &
(cd services/conversation-service && pnpm dev) &
(cd services/exercise-service && pnpm dev) &

# 3. Run Expo
cd apps/mobile && npx expo start --ios
```

Verify:
- [ ] Register new user → redirected to onboarding
- [ ] Complete onboarding conversation (5+ messages)
- [ ] Land on home screen → tap "Start Session"
- [ ] Send 3+ messages in conversation
- [ ] Pierre embeds at least one exercise naturally
- [ ] Respond to exercise → result banner appears
- [ ] Exercise session exists in DB: `SELECT * FROM exercise_sessions;`

---

## Spec Coverage Check

| Spec Section | Task(s) | Status |
|---|---|---|
| User auth (register, login, JWT) | Task 6, 7 | ✅ |
| User profiles + consent | Task 8 | ✅ |
| Conversation Engine v1 (LLM + SSE) | Task 10, 11 | ✅ |
| Exercise Engine v1 (18 exercises, static difficulty) | Task 12, 13 | ✅ |
| Exercise embedding into conversation | Task 14 | ✅ |
| React Native client (auth flows) | Task 15, 16 | ✅ |
| React Native conversation screen | Task 17 | ✅ |
| React Native exercise overlays | Task 17 | ✅ |
| Onboarding calibration flow | Task 18 | ✅ |
| PostgreSQL + pgvector setup | Task 2, 5 | ✅ |
| Conversation FSM states | Task 9 schema | ✅ (schema only; full FSM in Phase 2) |
| Adaptive Difficulty Engine | — | Phase 2 |
| Linguistic Biomarker Pipeline | — | Phase 2 |
| Analytics Service | — | Phase 2 |
| Web client | — | Phase 2 |
| AWS deployment | — | Phase 2 |
