# Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send daily re-engagement push notifications to users who haven't trained in the past 24 hours, using Expo's push notification infrastructure.

**Architecture:** The mobile app registers an Expo push token with the backend on launch. The user-service stores tokens in a new `pushTokens` table. A daily cron job in user-service queries for users who haven't completed an exercise in 24h and sends notifications via the Expo Push API (a simple HTTPS endpoint — no Firebase/APNs SDK required). The mobile app handles permission requests and foreground notification display.

**Tech Stack:** expo-notifications (mobile), Expo Push API (`https://exp.host/--/api/v2/push/send`), node-cron (backend scheduler), drizzle-orm (DB), existing mocha/chai/sinon/supertest test stack (backend), Jest/RNTL (mobile)

---

## File Map

- Create: `services/user-service/src/db/migrations/0005_push_tokens.sql` — SQL migration adding `push_tokens` table
- Modify: `services/user-service/src/db/schema.ts` — add `pushTokens` table definition
- Modify: `services/user-service/src/routes/users.ts` — add `POST /users/me/push-token` and `DELETE /users/me/push-token` routes
- Create: `services/user-service/src/services/notifications.service.ts` — Expo Push API sender + daily job logic
- Modify: `services/user-service/src/index.ts` — start cron job on app boot
- Modify: `services/user-service/src/__tests__/users.test.ts` — add push token route tests
- Modify: `apps/mobile/app/_layout.tsx` — request permission + register token on app launch
- Modify: `apps/mobile/lib/api.ts` — add `api.users.registerPushToken` and `api.users.deletePushToken`

---

### Task 1: Add pushTokens table to user-service schema

**Files:**
- Modify: `services/user-service/src/db/schema.ts`
- Create: `services/user-service/src/db/migrations/0005_push_tokens.sql`

Background: We need a `push_tokens` table that maps users to their Expo push tokens. A user can have multiple tokens (multiple devices). Tokens can be deleted when the app unregisters or a send fails permanently.

- [ ] **Step 1: Write the migration SQL**

Create `services/user-service/src/db/migrations/0005_push_tokens.sql`:

```sql
CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON push_tokens(user_id);
```

- [ ] **Step 2: Add the Drizzle table definition**

In `services/user-service/src/db/schema.ts`, after the `refreshTokens` table:

```typescript
export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

- [ ] **Step 3: Apply the migration**

```bash
cd services/user-service
psql $DATABASE_URL -f src/db/migrations/0005_push_tokens.sql
```

Expected: `CREATE TABLE`, `CREATE INDEX` — no errors.

- [ ] **Step 4: Commit**

```bash
cd services/user-service
git add src/db/schema.ts src/db/migrations/0005_push_tokens.sql
git commit -m "feat(user-service): add push_tokens table"
```

---

### Task 2: Add push token routes to user-service

**Files:**
- Modify: `services/user-service/src/routes/users.ts`
- Modify: `services/user-service/src/__tests__/users.test.ts`

Background:
- `POST /users/me/push-token` — upserts a push token for the authenticated user. Body: `{ token: string }`. The token must start with `ExponentPushToken[` (Expo's format). Returns 204.
- `DELETE /users/me/push-token` — removes the token. Body: `{ token: string }`. Returns 204.

- [ ] **Step 1: Write the failing tests**

Open `services/user-service/src/__tests__/users.test.ts`. Add a `makeTokenDb` helper and two describe blocks at the end of the file, after the existing tests:

```typescript
// ─── Push token helpers ───────────────────────────────────────────────────────

function makePushTokenDb(overrides: Record<string, any> = {}) {
  const db: any = {
    query: {
      users: { findFirst: sinon.stub().resolves({ id: 'user-123', email: 'a@b.com', name: 'Test' }) },
    },
    insert: sinon.stub(),
    delete: sinon.stub(),
    ...overrides,
  };

  db.insert.returns({
    values: sinon.stub().returns({
      onConflictDoNothing: sinon.stub().resolves([]),
    }),
  });

  db.delete.returns({
    where: sinon.stub().resolves([]),
  });

  return db;
}

// ─── POST /users/me/push-token ────────────────────────────────────────────────

describe('POST /users/me/push-token', () => {
  afterEach(() => sinon.restore());

  it('returns 204 when a valid Expo token is registered', async () => {
    const db = makePushTokenDb();
    const token = await makeToken();
    const res = await request(createApp(db))
      .post('/users/me/push-token')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' });

    expect(res.status).to.equal(204);
  });

  it('returns 400 when token is missing', async () => {
    const db = makePushTokenDb();
    const token = await makeToken();
    const res = await request(createApp(db))
      .post('/users/me/push-token')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).to.equal(400);
  });

  it('returns 400 when token does not have Expo format', async () => {
    const db = makePushTokenDb();
    const token = await makeToken();
    const res = await request(createApp(db))
      .post('/users/me/push-token')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'not-an-expo-token' });

    expect(res.status).to.equal(400);
  });

  it('returns 401 without auth token', async () => {
    const db = makePushTokenDb();
    const res = await request(createApp(db))
      .post('/users/me/push-token')
      .send({ token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' });

    expect(res.status).to.equal(401);
  });
});

// ─── DELETE /users/me/push-token ─────────────────────────────────────────────

describe('DELETE /users/me/push-token', () => {
  afterEach(() => sinon.restore());

  it('returns 204 when token is deleted', async () => {
    const db = makePushTokenDb();
    const token = await makeToken();
    const res = await request(createApp(db))
      .delete('/users/me/push-token')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' });

    expect(res.status).to.equal(204);
  });

  it('returns 400 when token is missing', async () => {
    const db = makePushTokenDb();
    const token = await makeToken();
    const res = await request(createApp(db))
      .delete('/users/me/push-token')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).to.equal(400);
  });

  it('returns 401 without auth token', async () => {
    const db = makePushTokenDb();
    const res = await request(createApp(db))
      .delete('/users/me/push-token')
      .send({ token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' });

    expect(res.status).to.equal(401);
  });
});
```

Note: `makeToken` already exists in this test file and signs a JWT for `user-123`. Check the top of the file and reuse the existing helper — do not create a duplicate.

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd services/user-service && pnpm test 2>&1 | tail -20
```

Expected: 7 new failing tests (routes not yet implemented).

- [ ] **Step 3: Implement the routes**

In `services/user-service/src/routes/users.ts`, add the following imports at the top alongside the existing ones:

```typescript
import { pushTokens } from '../db/schema';
import { and } from 'drizzle-orm';
```

Then add these two routes inside `createUsersRouter`, after the existing `router.post('/me/complete-onboarding', ...)` handler and before `return router`:

```typescript
  const pushTokenSchema = z.object({
    token: z.string().regex(/^ExponentPushToken\[.+\]$/, 'Invalid Expo push token format'),
  });

  router.post('/me/push-token', async (req, res: Response) => {
    const { userId } = req as AuthRequest;
    const parsed = pushTokenSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    await db.insert(pushTokens).values({ userId, token: parsed.data.token }).onConflictDoNothing();
    return res.status(204).send();
  });

  router.delete('/me/push-token', async (req, res: Response) => {
    const { userId } = req as AuthRequest;
    const parsed = pushTokenSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    await db.delete(pushTokens).where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, parsed.data.token)));
    return res.status(204).send();
  });
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd services/user-service && pnpm test
```

Expected: all existing tests pass + 7 new tests pass.

- [ ] **Step 5: Commit**

```bash
cd services/user-service
git add src/routes/users.ts src/__tests__/users.test.ts
git commit -m "feat(user-service): add push token registration routes"
```

---

### Task 3: Create notification sender service

**Files:**
- Create: `services/user-service/src/services/notifications.service.ts`

Background: The Expo Push API accepts a POST to `https://exp.host/--/api/v2/push/send` with an array of message objects. No SDK needed — it's a plain HTTPS call. If a token returns `DeviceNotRegistered`, we delete it from the DB so we don't keep sending to dead tokens.

The daily job logic: find all users whose most recent completed exercise session is older than 24 hours (or who have never completed one), collect their push tokens, and send a reminder.

The exercise_sessions table lives in the exercise-service DB. Since we can't query across service DBs directly, the notification service will call `GET /exercises/history` on the exercise-service internal API using a service-level token (a long-lived JWT signed with the same JWT_SECRET). For Phase 1, use a simpler heuristic: send to all users who have at least one push token registered — we'll refine targeting in a later iteration.

- [ ] **Step 1: Write the notification service**

Create `services/user-service/src/services/notifications.service.ts`:

```typescript
import { eq, inArray } from 'drizzle-orm';
import type { DB } from '../db/index';
import { pushTokens, users } from '../db/schema';

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoReceiptData {
  status: 'ok' | 'error';
  details?: { error?: string };
}

export async function sendDailyReminders(db: DB): Promise<void> {
  // Fetch all registered push tokens
  const rows = await db.select({ token: pushTokens.token, userId: pushTokens.userId }).from(pushTokens);

  if (rows.length === 0) return;

  const messages: ExpoMessage[] = rows.map(row => ({
    to: row.token,
    title: 'Time to train',
    body: 'Keep your streak alive — a quick exercise with Pierre takes just a few minutes.',
    data: { screen: 'train' },
  }));

  // Expo Push API accepts up to 100 messages per request
  const chunks: ExpoMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  const deadTokens: string[] = [];

  for (const chunk of chunks) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(chunk),
    });

    if (!res.ok) continue;

    const json = await res.json() as { data: ExpoReceiptData[] };
    json.data.forEach((receipt, i) => {
      if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
        deadTokens.push(chunk[i].to);
      }
    });
  }

  if (deadTokens.length > 0) {
    await db.delete(pushTokens).where(inArray(pushTokens.token, deadTokens));
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd services/user-service
git add src/services/notifications.service.ts
git commit -m "feat(user-service): add Expo push notification sender service"
```

---

### Task 4: Wire daily cron job into user-service startup

**Files:**
- Modify: `services/user-service/src/index.ts`
- Modify: `services/user-service/package.json`

Background: `node-cron` runs a scheduled function inside the Node process. We schedule the daily reminder at 9:00 AM UTC. In production you'd run this in a separate worker, but for Phase 1 running it in the same process is fine.

- [ ] **Step 1: Install node-cron**

```bash
cd services/user-service && pnpm add node-cron && pnpm add -D @types/node-cron
```

- [ ] **Step 2: Wire the cron job**

Replace the contents of `services/user-service/src/index.ts`:

```typescript
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import { db as defaultDb } from './db/index';
import type { DB } from './db/index';
import { createAuthRouter } from './routes/auth';
import { createUsersRouter } from './routes/users';
import { sendDailyReminders } from './services/notifications.service';

export function createApp(db: DB = defaultDb) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'user-service' });
  });

  app.use('/auth', createAuthRouter(db));
  app.use('/users', createUsersRouter(db));

  return app;
}

if (require.main === module) {
  const port = process.env.USER_SERVICE_PORT ?? 3001;
  createApp().listen(port, () => console.log(`user-service listening on port ${port}`));

  // Daily reminder at 9:00 AM UTC
  cron.schedule('0 9 * * *', async () => {
    console.log('[notifications] Sending daily reminders');
    try {
      await sendDailyReminders(defaultDb);
      console.log('[notifications] Done');
    } catch (err) {
      console.error('[notifications] Failed:', err);
    }
  });
}
```

- [ ] **Step 3: Verify the service starts**

```bash
cd services/user-service && pnpm build && node dist/index.js &
sleep 2 && curl http://localhost:3001/health
```

Expected: `{"status":"ok","service":"user-service"}`

Kill the background process after verifying: `kill %1`

- [ ] **Step 4: Commit**

```bash
cd services/user-service
git add src/index.ts package.json pnpm-lock.yaml
git commit -m "feat(user-service): schedule daily push notification reminders via node-cron"
```

---

### Task 5: Mobile — request permission and register push token

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/lib/api.ts`
- Modify: `apps/mobile/package.json`

Background: On iOS, the app must request notification permission before registering. On Android 13+ the same applies. We do this once after the user is authenticated. `expo-notifications` provides `requestPermissionsAsync()` and `getExpoPushTokenAsync()`. The project ID is required for `getExpoPushTokenAsync` — it lives in `app.json` or `app.config.js` under `extra.eas.projectId`.

- [ ] **Step 1: Install expo-notifications**

```bash
cd apps/mobile && pnpm add expo-notifications
```

For bare workflow, also run:

```bash
npx expo install expo-notifications
```

- [ ] **Step 2: Add the API call**

In `apps/mobile/lib/api.ts`, add inside the `users` object after `me`:

```typescript
    registerPushToken: (token: string, pushToken: string) =>
      request<void>(`${API.user}/users/me/push-token`, {
        method: 'POST',
        token,
        body: JSON.stringify({ token: pushToken }),
      }),
    deletePushToken: (token: string, pushToken: string) =>
      request<void>(`${API.user}/users/me/push-token`, {
        method: 'DELETE',
        token,
        body: JSON.stringify({ token: pushToken }),
      }),
```

- [ ] **Step 3: Request permission and register token in RootLayout**

In `apps/mobile/app/_layout.tsx`, add the following imports after the existing ones:

```typescript
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '@/lib/api';
```

Add a `registerForPushNotifications` function and a foreground handler before `AuthGuard`:

```typescript
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotifications(accessToken: string): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return;

  const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.users.registerPushToken(accessToken, pushToken).catch(() => {
    // Non-fatal — user can still use the app without notifications
  });
}
```

Inside `AuthGuard`, call `registerForPushNotifications` when the user becomes authenticated. Replace the authenticated redirect block:

```typescript
    if (inAuthGroup) {
      if (user && !user.onboardingComplete) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)');
      }
      // Register for push notifications after successful login
      registerForPushNotifications(token);
      return;
    }
```

- [ ] **Step 4: Verify on device/simulator**

Run the app on a real device (push tokens don't work on iOS Simulator). After logging in, iOS should show a permission dialog. Accept it, then check the user-service DB:

```bash
psql $DATABASE_URL -c "SELECT * FROM push_tokens LIMIT 5;"
```

Expected: one row with your device's Expo push token.

- [ ] **Step 5: Commit**

```bash
cd apps/mobile
git add app/_layout.tsx lib/api.ts package.json
git commit -m "feat(mobile): request push notification permission and register Expo token"
```

---

## Self-Review

**Spec coverage:**
- ✅ Push token stored per user in DB (Task 1)
- ✅ `POST /users/me/push-token` — registers token, validates Expo format, idempotent (Task 2)
- ✅ `DELETE /users/me/push-token` — removes token (Task 2)
- ✅ Dead token cleanup on `DeviceNotRegistered` error (Task 3)
- ✅ Daily reminder cron at 9:00 AM UTC (Task 4)
- ✅ Mobile permission request + token registration on auth (Task 5)
- ✅ Non-fatal: notification failure never blocks app usage

**Placeholder scan:** No TBDs. All code is complete.

**Type consistency:** `pushTokens` table name used consistently across schema, routes, and notification service. `api.users.registerPushToken` / `deletePushToken` match the route paths exactly.
