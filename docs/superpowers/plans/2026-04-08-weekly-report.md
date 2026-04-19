# Weekly Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Sunday evening, send each user who has trained this week a personalized push notification summarising their week — sessions completed, average score, best domain, and a nudge toward their weakest area.

**Architecture:** exercise-service runs a Sunday 6 PM UTC cron job that queries its local DB for the current week's completed sessions per user, formats a personalised message, then calls a new `POST /internal/notify` endpoint on user-service. user-service looks up the user's push tokens and sends via the Expo Push API. Service-to-service calls use an internal shared secret (`INTERNAL_SECRET` env var) rather than user JWTs.

**Tech Stack:** node-cron (exercise-service), fetch (service-to-service HTTP), Expo Push API, drizzle-orm

**Dependency:** The push-notifications plan (`2026-04-07-push-notifications.md`) must be executed first. Specifically, the `push_tokens` table and the `sendDailyReminders` function in user-service must already exist before this plan is implemented.

---

## File Map

- Modify: `services/user-service/src/routes/users.ts` — add `POST /internal/notify`
- Modify: `services/user-service/src/__tests__/users.test.ts` — add internal notify tests
- Create: `services/exercise-service/src/services/weekly-report.service.ts` — weekly stats + message generation
- Modify: `services/exercise-service/src/index.ts` — register Sunday cron job

---

### Task 1: Add POST /internal/notify to user-service

**Files:**
- Modify: `services/user-service/src/routes/users.ts`
- Modify: `services/user-service/src/__tests__/users.test.ts`

Background: This endpoint is called service-to-service, not by the mobile client. It accepts `{ userId, title, body }`, looks up all push tokens for that user, and sends via Expo. It is protected by a shared secret in the `X-Internal-Secret` header (env var `INTERNAL_SECRET`, defaults to `"dev-secret"` for local development). If the user has no push tokens, it returns 200 silently.

This route is added directly inside `createUsersRouter` for simplicity. It does not require the existing `requireAuth` middleware.

- [ ] **Step 1: Write the failing tests**

In `services/user-service/src/__tests__/users.test.ts`, add the following near the end of the file after the existing push token tests:

```typescript
// ─── POST /internal/notify ────────────────────────────────────────────────────

function makeInternalNotifyDb(tokens: string[] = []) {
  const db: any = {
    query: {
      users: { findFirst: sinon.stub().resolves({ id: 'user-123' }) },
    },
    select: sinon.stub(),
    delete: sinon.stub(),
    insert: sinon.stub(),
  };
  // Stub the push token select chain
  db.select.returns({
    from: sinon.stub().returns({
      where: sinon.stub().resolves(tokens.map(t => ({ token: t, userId: 'user-123' }))),
    }),
  });
  db.delete.returns({ where: sinon.stub().resolves([]) });
  return db;
}

describe('POST /internal/notify', () => {
  let fetchStub: sinon.SinonStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch' as any);
    fetchStub.resolves({
      ok: true,
      json: async () => ({ data: [{ status: 'ok' }] }),
    });
  });

  afterEach(() => sinon.restore());

  it('returns 204 and sends push when user has tokens', async () => {
    const db = makeInternalNotifyDb(['ExponentPushToken[abc]']);
    const res = await request(createApp(db))
      .post('/internal/notify')
      .set('X-Internal-Secret', process.env.INTERNAL_SECRET ?? 'dev-secret')
      .send({ userId: 'user-123', title: 'Test', body: 'Hello' });

    expect(res.status).to.equal(204);
    expect(fetchStub.calledOnce).to.be.true;
  });

  it('returns 204 silently when user has no tokens', async () => {
    const db = makeInternalNotifyDb([]);
    const res = await request(createApp(db))
      .post('/internal/notify')
      .set('X-Internal-Secret', process.env.INTERNAL_SECRET ?? 'dev-secret')
      .send({ userId: 'user-123', title: 'Test', body: 'Hello' });

    expect(res.status).to.equal(204);
    expect(fetchStub.called).to.be.false;
  });

  it('returns 401 with wrong secret', async () => {
    const db = makeInternalNotifyDb([]);
    const res = await request(createApp(db))
      .post('/internal/notify')
      .set('X-Internal-Secret', 'wrong-secret')
      .send({ userId: 'user-123', title: 'Test', body: 'Hello' });

    expect(res.status).to.equal(401);
  });

  it('returns 400 when userId or title or body is missing', async () => {
    const db = makeInternalNotifyDb([]);
    const res = await request(createApp(db))
      .post('/internal/notify')
      .set('X-Internal-Secret', process.env.INTERNAL_SECRET ?? 'dev-secret')
      .send({ userId: 'user-123' }); // missing title and body

    expect(res.status).to.equal(400);
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
cd services/user-service && pnpm test 2>&1 | tail -20
```

Expected: 4 new failing tests.

- [ ] **Step 3: Implement the route**

In `services/user-service/src/routes/users.ts`, add `pushTokens` to the existing schema import:

```typescript
import { users, consents, pushTokens } from '../db/schema';
```

Also add `inArray` to the existing drizzle-orm import if not already present:

```typescript
import { eq, and, inArray } from 'drizzle-orm';
```

Add the following route inside `createUsersRouter` BEFORE `router.use(requireAuth)` so it bypasses auth middleware:

```typescript
  const internalNotifySchema = z.object({
    userId: z.string().uuid(),
    title: z.string().min(1),
    body: z.string().min(1),
  });

  router.post('/internal/notify', async (req, res: Response) => {
    const secret = process.env.INTERNAL_SECRET ?? 'dev-secret';
    if (req.headers['x-internal-secret'] !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const parsed = internalNotifySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const { userId, title, body } = parsed.data;
    const tokens = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));

    if (tokens.length === 0) return res.status(204).send();

    const messages = tokens.map(({ token }) => ({ to: token, title, body }));
    const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(messages),
    });

    if (expoRes.ok) {
      const json = await expoRes.json() as { data: Array<{ status: string; details?: { error?: string } }> };
      const dead = json.data
        .map((r, i) => r.status === 'error' && r.details?.error === 'DeviceNotRegistered' ? tokens[i].token : null)
        .filter(Boolean) as string[];
      if (dead.length > 0) {
        await db.delete(pushTokens).where(inArray(pushTokens.token, dead));
      }
    }

    return res.status(204).send();
  });
```

Note: This route is added BEFORE `router.use(requireAuth)` so that `requireAuth` does not apply to it.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd services/user-service && pnpm test
```

Expected: all existing tests + 4 new tests pass.

- [ ] **Step 5: Commit**

```bash
cd services/user-service
git add src/routes/users.ts src/__tests__/users.test.ts
git commit -m "feat(user-service): add POST /internal/notify for service-to-service push notifications"
```

---

### Task 2: Create weekly report service in exercise-service

**Files:**
- Create: `services/exercise-service/src/services/weekly-report.service.ts`
- Modify: `services/exercise-service/src/index.ts`

Background: The weekly report job runs every Sunday at 6 PM UTC. It queries the `exercise_sessions` table for the current ISO week's completed sessions, groups by user, computes per-user stats, formats a personalised message for each user who trained this week, then calls `POST /internal/notify` on user-service for each.

The user-service internal URL is read from `USER_SERVICE_URL` env var (defaults to `http://localhost:3001`).

- [ ] **Step 1: Create the service**

Create `services/exercise-service/src/services/weekly-report.service.ts`:

```typescript
import { and, gte, isNotNull } from 'drizzle-orm';
import type { DB } from '../db/index';
import { exerciseSessions } from '../db/schema';

const DOMAIN_LABELS: Record<string, string> = {
  memory: 'Memory',
  attention: 'Attention',
  processing_speed: 'Processing Speed',
  executive_function: 'Executive Function',
  language: 'Language',
  visuospatial: 'Visuospatial',
};

function currentWeekStart(): Date {
  const now = new Date();
  const day = now.getUTCDay() || 7; // Mon=1, Sun=7
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1));
  return monday;
}

async function notifyUser(userId: string, title: string, body: string): Promise<void> {
  const userServiceUrl = process.env.USER_SERVICE_URL ?? 'http://localhost:3001';
  const secret = process.env.INTERNAL_SECRET ?? 'dev-secret';
  await fetch(`${userServiceUrl}/users/internal/notify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': secret,
    },
    body: JSON.stringify({ userId, title, body }),
  });
}

export async function sendWeeklyReports(db: DB): Promise<void> {
  const weekStart = currentWeekStart();

  const sessions = await db
    .select()
    .from(exerciseSessions)
    .where(and(isNotNull(exerciseSessions.completedAt), gte(exerciseSessions.startedAt, weekStart)));

  if (sessions.length === 0) return;

  // Group by user
  const byUser: Record<string, typeof sessions> = {};
  for (const s of sessions) {
    if (!byUser[s.userId]) byUser[s.userId] = [];
    byUser[s.userId].push(s);
  }

  for (const [userId, userSessions] of Object.entries(byUser)) {
    const count = userSessions.length;
    const avg = Math.round(
      userSessions.reduce((sum, s) => sum + (s.normalizedScore ?? 0), 0) / count
    );

    // Find best and worst domain
    const domainScores: Record<string, number[]> = {};
    for (const s of userSessions) {
      if (!domainScores[s.domain]) domainScores[s.domain] = [];
      domainScores[s.domain].push(s.normalizedScore ?? 0);
    }
    const domainAvgs = Object.entries(domainScores).map(([domain, scores]) => ({
      domain,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));
    domainAvgs.sort((a, b) => b.avg - a.avg);
    const best = domainAvgs[0];
    const worst = domainAvgs[domainAvgs.length - 1];

    const title = `Your week: ${count} ${count === 1 ? 'session' : 'sessions'} · ${avg}% avg`;
    const body = best === worst
      ? `Nice work this week. Keep training ${DOMAIN_LABELS[best.domain] ?? best.domain} to build momentum.`
      : `Strength: ${DOMAIN_LABELS[best.domain] ?? best.domain} (${best.avg}%). Consider more ${DOMAIN_LABELS[worst.domain] ?? worst.domain} practice next week.`;

    await notifyUser(userId, title, body);
  }
}
```

- [ ] **Step 2: Register the Sunday cron in exercise-service index**

In `services/exercise-service/src/index.ts`, add the following import at the top:

```typescript
import cron from 'node-cron';
import { sendWeeklyReports } from './services/weekly-report.service';
```

Also add `node-cron` to the package if not already there:

```bash
cd services/exercise-service && pnpm add node-cron && pnpm add -D @types/node-cron
```

In the `if (require.main === module)` block, after the server listen call, add:

```typescript
  // Weekly report: every Sunday at 6 PM UTC
  cron.schedule('0 18 * * 0', async () => {
    console.log('[weekly-report] Generating weekly reports');
    try {
      await sendWeeklyReports(defaultDb);
      console.log('[weekly-report] Done');
    } catch (err) {
      console.error('[weekly-report] Failed:', err);
    }
  });
```

- [ ] **Step 3: Verify the service starts**

```bash
cd services/exercise-service && pnpm build && node dist/index.js &
sleep 2 && curl http://localhost:3003/health
```

Expected: `{"status":"ok","service":"exercise-service"}`

Kill the background process: `kill %1`

- [ ] **Step 4: Commit**

```bash
cd services/exercise-service
git add src/services/weekly-report.service.ts src/index.ts package.json pnpm-lock.yaml
git commit -m "feat(exercise-service): add weekly report cron job with personalised push summaries"
```

---

## Self-Review

**Spec coverage:**
- ✅ Sunday 6 PM UTC schedule (Task 2)
- ✅ Sessions completed this week + average score in notification (Task 2)
- ✅ Best domain called out by name (Task 2)
- ✅ Weakest domain nudge in body (Task 2)
- ✅ Silent if user has no tokens (Task 1 — `POST /internal/notify` returns 204 silently)
- ✅ Dead token cleanup propagated (Task 1)
- ✅ Internal secret protects the endpoint (Task 1)
- ✅ No notification sent to users who didn't train this week (Task 2 — only users in `byUser` map)

**Placeholder scan:** No TBDs. `notifyUser` URL defaults to `localhost:3001`. `INTERNAL_SECRET` defaults to `dev-secret`. Both are overridable via env.

**Type consistency:** `sendWeeklyReports(db: DB)` matches the `DB` type from `../db/index` used throughout exercise-service. Route added before `router.use(requireAuth)` — critical for it to be accessible without user JWT.
