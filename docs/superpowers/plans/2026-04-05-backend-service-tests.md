# Backend Service Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the missing integration-test coverage across all three backend services so every public route and key service path is tested.

**Architecture:** Tests added directly into the existing mocha/chai/sinon/supertest test files. No new test files are created. Each service is exercised through `createApp(...)` with a fully-stubbed in-memory DB so no real Postgres is needed.

**Tech Stack:** mocha, chai, sinon, supertest, jose (JWT signing in tests)

---

## Current gaps

| Service | Missing coverage |
|---|---|
| user-service | `POST /auth/refresh` — body token, cookie token, missing, invalid, expired |
| conversation-service | `GET /conversations`, `GET /conversations/latest` |
| conversation-service | `POST /conversations/:id/messages` with exercise query params → `exercise.result` SSE event |
| exercise-service | `GET /exercises/history` |

---

## File Map

- Modify: `services/user-service/src/__tests__/auth.test.ts` — add `makeRefreshDb` helper + 5 `POST /auth/refresh` tests
- Modify: `services/conversation-service/src/__tests__/conversations.test.ts` — add 5 tests for `GET /conversations`, `GET /conversations/latest`, and SSE exercise.result
- Modify: `services/exercise-service/src/__tests__/exercises.test.ts` — add 2 `GET /exercises/history` tests

---

### Task 1: POST /auth/refresh tests (user-service)

**Files:**
- Modify: `services/user-service/src/__tests__/auth.test.ts`

Background: `POST /auth/refresh` calls `refreshAccessToken(db, rawToken)` which:
1. SHA-256 hashes the raw token and looks up `db.query.refreshTokens.findFirst`
2. If not found → throws `{ code: 'INVALID_TOKEN' }` → route returns 401
3. If found but `expiresAt < now` → calls `db.delete(refreshTokens).where(...)` → throws `{ code: 'TOKEN_EXPIRED' }` → 401
4. If valid → `db.delete` old token, `db.insert` new refresh token, returns new `accessToken` + `refreshToken`

The route also accepts a refresh token from the `refresh_token` httpOnly cookie (set by login/register) in addition to the request body.

- [ ] **Step 1: Write the failing tests**

Add the following to the end of `services/user-service/src/__tests__/auth.test.ts`, after the existing `POST /auth/login` describe block:

```typescript
// ─── POST /auth/refresh ───────────────────────────────────────────────────────

function makeRefreshDb(tokenOverrides: Record<string, any> = {}) {
  const tokenRecord = {
    id: 'rt-1',
    userId: 'user-123',
    tokenHash: 'some-hash',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days out
    createdAt: new Date(),
    ...tokenOverrides,
  };

  const db: any = {
    query: {
      users: { findFirst: sinon.stub() },
      refreshTokens: { findFirst: sinon.stub().resolves(tokenRecord) },
    },
    insert: sinon.stub(),
    update: sinon.stub(),
    delete: sinon.stub(),
  };

  // insert chain for new refresh token (generateRefreshToken writes to DB)
  db.insert.returns({
    values: sinon.stub().returns({
      returning: sinon.stub().resolves([{}]),
    }),
  });

  // delete chain (rotate old token)
  db.delete.returns({
    where: sinon.stub().resolves([]),
  });

  return db;
}

describe('POST /auth/refresh', () => {
  afterEach(() => sinon.restore());

  it('returns 200 with new accessToken and refreshToken when body token is valid', async () => {
    const db = makeRefreshDb();
    const app = createApp(db);
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'any-raw-token' });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('accessToken');
    expect(res.body).to.have.property('refreshToken');
    expect(res.headers['set-cookie']).to.exist;
  });

  it('returns 200 when refresh token is supplied via httpOnly cookie', async () => {
    const db = makeRefreshDb();
    const app = createApp(db);
    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', 'refresh_token=cookie-raw-token')
      .send({}); // no body token

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('accessToken');
  });

  it('returns 400 when no refresh token is provided in body or cookie', async () => {
    const db = makeRefreshDb();
    const app = createApp(db);
    const res = await request(app)
      .post('/auth/refresh')
      .send({});

    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal('Missing refresh token');
  });

  it('returns 401 for an invalid (unrecognised) refresh token', async () => {
    const db = makeRefreshDb();
    db.query.refreshTokens.findFirst.resolves(null); // not in DB
    const app = createApp(db);
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'bad-token' });

    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal('Invalid or expired refresh token');
  });

  it('returns 401 for an expired refresh token', async () => {
    const db = makeRefreshDb({ expiresAt: new Date(Date.now() - 1000) }); // already past
    const app = createApp(db);
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'expired-raw-token' });

    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal('Invalid or expired refresh token');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd services/user-service && pnpm test 2>&1 | tail -20
```

Expected: 5 failing tests (describe block and tests not implemented yet) — or errors if DB stub is missing a method. Either way the test file must be parseable without compile errors.

- [ ] **Step 3: Run tests to verify they pass (no implementation needed — only stubs)**

The stubs in `makeRefreshDb` are the full implementation for the test layer. Running the tests again should produce 5 passes because `createApp` already wires up `/auth/refresh` and the route delegates to `refreshAccessToken` which is fully implemented.

```bash
cd services/user-service && pnpm test
```

Expected output: all existing tests pass + 5 new tests pass.

- [ ] **Step 4: Commit**

```bash
cd services/user-service
git add src/__tests__/auth.test.ts
git commit -m "test(user-service): add POST /auth/refresh integration tests"
```

---

### Task 2: GET /conversations and GET /conversations/latest tests (conversation-service)

**Files:**
- Modify: `services/conversation-service/src/__tests__/conversations.test.ts`

Background:
- `GET /conversations` → `listConversations(userId)` → `db.select().from().where().orderBy()`. The existing `makeDb` already returns `orderByStub` which controls this chain.
- `GET /conversations/latest` → `getLatestConversation(userId)` → `db.query.conversations.findFirst()`. Already stubbed in `makeDb`.
- Both routes return 401 without a token (enforced by `requireAuth` middleware at the router level).

- [ ] **Step 1: Write the failing tests**

Add the following to `services/conversation-service/src/__tests__/conversations.test.ts`, after the existing `POST /conversations` describe block and before `GET /conversations/:id/messages`:

```typescript
// ─── GET /conversations ───────────────────────────────────────────────────────

describe('GET /conversations', () => {
  afterEach(() => sinon.restore());

  it('returns the conversation list for authenticated user', async () => {
    const { db, orderByStub } = makeDb();
    orderByStub.resolves([makeConversation(), makeConversation({ id: 'conv-2' })]);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/conversations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array').with.length(2);
    expect(res.body[0].id).to.equal('conv-1');
  });

  it('returns 401 without token', async () => {
    const { db } = makeDb();
    const res = await request(createApp({ db })).get('/conversations');
    expect(res.status).to.equal(401);
  });
});

// ─── GET /conversations/latest ────────────────────────────────────────────────

describe('GET /conversations/latest', () => {
  afterEach(() => sinon.restore());

  it('returns the most recent non-ended conversation', async () => {
    const { db } = makeDb();
    db.query.conversations.findFirst.resolves(makeConversation({ state: 'ACTIVE' }));
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/conversations/latest')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.id).to.equal('conv-1');
    expect(res.body.state).to.equal('ACTIVE');
  });

  it('returns null when user has no active conversations', async () => {
    const { db } = makeDb();
    db.query.conversations.findFirst.resolves(null);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/conversations/latest')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.null;
  });

  it('returns 401 without token', async () => {
    const { db } = makeDb();
    const res = await request(createApp({ db })).get('/conversations/latest');
    expect(res.status).to.equal(401);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd services/conversation-service && pnpm test 2>&1 | tail -20
```

Expected: new describe blocks are found but individual assertions fail (or pass — either is fine at this step, the goal is confirming the file compiles and tests run).

- [ ] **Step 3: Run tests to verify they all pass**

```bash
cd services/conversation-service && pnpm test
```

Expected: all existing tests + 5 new tests pass.

- [ ] **Step 4: Commit**

```bash
cd services/conversation-service
git add src/__tests__/conversations.test.ts
git commit -m "test(conversation-service): add GET /conversations and GET /conversations/latest tests"
```

---

### Task 3: exercise.result SSE event test (conversation-service)

**Files:**
- Modify: `services/conversation-service/src/__tests__/conversations.test.ts`

Background: When `POST /conversations/:id/messages` is called with query params `exerciseSessionId`, `domain`, and `exerciseFragment`, AND the Claude response contains `EXERCISE_SCORE: {...}` JSON, the SSE stream must emit an `exercise.result` event before `message.complete`.

The `makeClaudeMock` already exists but returns a plain response. We need a variant that returns a response containing an `EXERCISE_SCORE` line.

- [ ] **Step 1: Write the failing test**

Add inside the existing `POST /conversations/:id/messages` describe block, after the last existing test:

```typescript
  it('emits exercise.result event when EXERCISE_SCORE is in Claude response', async () => {
    const { db, orderByStub } = makeDb();
    db.query.conversations.findFirst.resolves(makeConversation());
    orderByStub.resolves([makeMessage({ role: 'user', content: 'apple, bridge, cloud' })]);
    db.insert.callsFake(() => ({
      values: sinon.stub().returns({
        returning: sinon.stub().resolves([makeMessage({ role: 'assistant', content: 'Good work!' })]),
      }),
    }));

    const scoreText = 'Good work!\nEXERCISE_SCORE: {"rawScore": 3, "normalizedScore": 37.5, "feedback": "Nice effort!"}';
    const claude: ClaudeClient = {
      stream: sinon.stub().callsFake(async (_msgs, _sys, cb) => {
        cb.onDelta(scoreText);
        await cb.onComplete(scoreText, 10, 5);
      }),
    };

    const token = await makeToken();
    const res = await request(createApp({ db, claude }))
      .post('/conversations/conv-1/messages')
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'text/event-stream')
      .query({
        exerciseSessionId: 'sess-1',
        domain: 'memory',
        exerciseFragment: encodeURIComponent('Score the words'),
      })
      .send({ content: 'apple, bridge, cloud' });

    expect(res.status).to.equal(200);
    expect(res.text).to.include('event: exercise.result');
    expect(res.text).to.include('"rawScore":3');
    expect(res.text).to.include('"normalizedScore":37.5');
    expect(res.text).to.include('event: message.complete');
  });
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd services/conversation-service && pnpm test 2>&1 | grep -E "passing|failing|exercise.result"
```

Expected: 1 new failing test (missing exercise.result in SSE output) OR passes immediately if `streamReply` already handles this correctly. Either way confirm the test runs.

- [ ] **Step 3: Run to verify all tests pass**

```bash
cd services/conversation-service && pnpm test
```

Expected: all tests pass including the new exercise.result test.

- [ ] **Step 4: Commit**

```bash
cd services/conversation-service
git add src/__tests__/conversations.test.ts
git commit -m "test(conversation-service): add exercise.result SSE event integration test"
```

---

### Task 4: GET /exercises/history tests (exercise-service)

**Files:**
- Modify: `services/exercise-service/src/__tests__/exercises.test.ts`

Background: `GET /exercises/history` → `getHistory(userId)` → `db.select().from().where().orderBy(...)`. The existing `makeDb` returns `orderByStub` which can be seeded to return completed sessions. The route has no error handling and requires auth.

- [ ] **Step 1: Write the failing tests**

Add the following after the existing `POST /exercises/:id/submit` describe block at the end of the file:

```typescript
// ─── GET /exercises/history ───────────────────────────────────────────────────

describe('GET /exercises/history', () => {
  afterEach(() => sinon.restore());

  it('returns session history for authenticated user', async () => {
    const { db, orderByStub } = makeDb();
    const completedSession = makeSession({
      completedAt: new Date('2026-01-02'),
      rawScore: 4,
      normalizedScore: 50,
    });
    orderByStub.resolves([completedSession]);
    const token = await makeToken();
    const res = await request(createApp(db))
      .get('/exercises/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array').with.length(1);
    expect(res.body[0].id).to.equal('session-1');
  });

  it('returns 401 without token', async () => {
    const { db } = makeDb();
    const res = await request(createApp(db)).get('/exercises/history');
    expect(res.status).to.equal(401);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd services/exercise-service && pnpm test 2>&1 | tail -20
```

Expected: 2 new tests are found and either pass or fail with assertion details.

- [ ] **Step 3: Run to verify all tests pass**

```bash
cd services/exercise-service && pnpm test
```

Expected: all existing tests + 2 new tests pass.

- [ ] **Step 4: Commit**

```bash
cd services/exercise-service
git add src/__tests__/exercises.test.ts
git commit -m "test(exercise-service): add GET /exercises/history integration tests"
```

---

## Self-Review

**Spec coverage:**
- ✅ `POST /auth/refresh` — body token, cookie token, missing, invalid, expired (5 tests)
- ✅ `GET /conversations` — list + 401 (2 tests)
- ✅ `GET /conversations/latest` — found, null, 401 (3 tests)
- ✅ SSE `exercise.result` event emitted when EXERCISE_SCORE in response (1 test)
- ✅ `GET /exercises/history` — returns list + 401 (2 tests)

**Placeholder scan:** No TBDs or stubs in test code.

**Type consistency:** All stubs match the existing `makeConversation`, `makeMessage`, `makeSession` helpers already defined in each test file. `ClaudeClient` import is already present in `conversations.test.ts`.
