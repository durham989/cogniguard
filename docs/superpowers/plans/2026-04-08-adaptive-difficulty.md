# Adaptive Difficulty Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the round-robin exercise selection in `getNextExercise` with a performance-based adaptive algorithm that targets underexplored domains first, then selects difficulty within a domain based on the user's recent scores.

**Architecture:** All logic lives in `exercise.service.ts`. No new DB tables or routes. The algorithm: (1) find the domain where the user has the fewest completed sessions — prioritise variety and untrained areas; (2) within that domain, compute the user's average score on their last 5 sessions; (3) select an exercise at the appropriate difficulty tier (lower if avg < 45%, same if 45–74%, higher if ≥ 75%); (4) never repeat the most recently completed exercise. Falls back to least-played domain if no exercises exist at the target difficulty.

**Tech Stack:** exercise-service (TypeScript/Drizzle)

---

## File Map

- Modify: `services/exercise-service/src/services/exercise.service.ts` — replace `getNextExercise` implementation
- Modify: `services/exercise-service/src/__tests__/exercises.test.ts` — update and add `GET /exercises/next` tests

---

### Task 1: Rewrite getNextExercise with adaptive selection

**Files:**
- Modify: `services/exercise-service/src/services/exercise.service.ts`
- Modify: `services/exercise-service/src/__tests__/exercises.test.ts`

Background on the current implementation: `getNextExercise` counts ALL completed sessions and uses `count % EXERCISES.length` to cycle round-robin. This means a user always gets the same exercise at the same index regardless of performance.

The new algorithm in detail:
1. Fetch all completed sessions for the user (existing query, already present).
2. Group sessions by domain. Find the domain with the fewest total sessions. Ties broken by which domain appears first in `DOMAIN_ORDER`.
3. From sessions in that domain, take the most recent 5, compute average `normalizedScore`.
4. Determine difficulty target:
   - `avg < 45` → target difficulty = max(1, lowestDifficultyInDomain - 1) effectively means pick lowest available
   - `45 ≤ avg < 75` → same difficulty range as most recently played exercise in this domain
   - `avg ≥ 75` → target difficulty + 1, capped at 5
5. Filter `EXERCISES` to the target domain. Sort by distance from target difficulty. Pick the first that is NOT the most recently completed exerciseId.
6. Fallback: if no exercise found in the target domain, pick any exercise not recently completed (round-robin over full list minus last).

- [ ] **Step 1: Write the failing tests**

In `services/exercise-service/src/__tests__/exercises.test.ts`, find the existing `GET /exercises/next` describe block. The existing `makeDb` stubs `orderByStub` for `select().from().where().orderBy()`. The adaptive algorithm uses `select().from().where()` without `orderBy`. You need to update `makeNextDb` (or add a new helper) that stubs a `where` result directly.

Add a `makeAdaptiveDb` helper and additional tests after any existing `GET /exercises/next` tests:

```typescript
// ─── Adaptive next exercise ───────────────────────────────────────────────────

function makeAdaptiveDb(completedSessions: Partial<ReturnType<typeof makeSession>>[] = []) {
  const resolved = completedSessions.map(s => makeSession(s as any));
  const db: any = {
    query: { exerciseSessions: { findFirst: sinon.stub().resolves(null) } },
    select: sinon.stub(),
    insert: sinon.stub(),
  };

  // select chain for fetching completed sessions
  db.select.returns({
    from: sinon.stub().returns({
      where: sinon.stub().resolves(resolved),
    }),
  });

  // insert chain for creating session record
  db.insert.returns({
    values: sinon.stub().returns({
      returning: sinon.stub().resolves([makeSession()]),
    }),
  });

  return { db };
}

describe('GET /exercises/next (adaptive)', () => {
  afterEach(() => sinon.restore());

  it('returns an exercise from the domain with fewest sessions', async () => {
    // Only memory sessions completed → should pick a non-memory domain next
    const sessions = Array.from({ length: 5 }, () =>
      makeSession({ domain: 'memory', normalizedScore: 60, completedAt: new Date() })
    );
    const { db } = makeAdaptiveDb(sessions);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/next')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.exercise.domain).to.not.equal('memory');
  });

  it('targets higher difficulty when recent avg ≥ 75%', async () => {
    // 5 attention sessions at difficulty 2, all scoring ≥ 75
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession({ domain: 'attention', difficulty: 2, normalizedScore: 80, completedAt: new Date(Date.now() - i * 1000) })
    );
    // Make sure all other domains have more sessions so attention is selected
    // by giving other domains many sessions
    const allSessions = [
      ...sessions,
      ...Array.from({ length: 15 }, () => makeSession({ domain: 'memory', normalizedScore: 60, completedAt: new Date() })),
      ...Array.from({ length: 15 }, () => makeSession({ domain: 'executive_function', normalizedScore: 60, completedAt: new Date() })),
      ...Array.from({ length: 15 }, () => makeSession({ domain: 'language', normalizedScore: 60, completedAt: new Date() })),
      ...Array.from({ length: 15 }, () => makeSession({ domain: 'processing_speed', normalizedScore: 60, completedAt: new Date() })),
      ...Array.from({ length: 15 }, () => makeSession({ domain: 'visuospatial', normalizedScore: 60, completedAt: new Date() })),
    ];
    const { db } = makeAdaptiveDb(allSessions);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/next')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    // Should select difficulty ≥ 3 for attention
    expect(res.body.exercise.difficulty).to.be.at.least(3);
    expect(res.body.exercise.domain).to.equal('attention');
  });

  it('returns 200 for a brand-new user with no sessions', async () => {
    const { db } = makeAdaptiveDb([]);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/next')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('exercise');
    expect(res.body).to.have.property('sessionId');
  });
});
```

- [ ] **Step 2: Run to verify tests fail (or partially pass)**

```bash
cd services/exercise-service && pnpm test 2>&1 | grep -E "adaptive|passing|failing"
```

Expected: new tests fail because `getNextExercise` still uses round-robin.

- [ ] **Step 3: Implement the adaptive algorithm**

In `services/exercise-service/src/services/exercise.service.ts`, replace the entire `getNextExercise` function with:

```typescript
  const DOMAIN_ORDER: CognitiveDomain[] = [
    'memory', 'attention', 'processing_speed', 'executive_function', 'language', 'visuospatial',
  ];

  async function getNextExercise(userId: string): Promise<{ exercise: ExerciseDefinition; sessionId: string }> {
    const completed = await db
      .select()
      .from(exerciseSessions)
      .where(and(eq(exerciseSessions.userId, userId), isNotNull(exerciseSessions.completedAt)));

    // ── Step 1: Find the domain with fewest completed sessions ────────────────
    const domainCounts: Record<string, number> = {};
    const domainLastDifficulty: Record<string, number> = {};
    const domainRecentScores: Record<string, number[]> = {};
    let lastCompletedExerciseId: string | null = null;
    let lastCompletedAt = 0;

    for (const s of completed) {
      domainCounts[s.domain] = (domainCounts[s.domain] ?? 0) + 1;
      const ts = s.completedAt!.getTime();
      if (ts > lastCompletedAt) {
        lastCompletedAt = ts;
        lastCompletedExerciseId = s.exerciseId;
        domainLastDifficulty[s.domain] = s.difficulty;
      }
    }

    // Sort domain by session count ascending, then by DOMAIN_ORDER for ties
    const targetDomain = DOMAIN_ORDER
      .map(d => ({ domain: d, count: domainCounts[d] ?? 0 }))
      .sort((a, b) => a.count - b.count)[0]!.domain;

    // ── Step 2: Compute recent avg for target domain ───────────────────────────
    const domainSessions = completed
      .filter(s => s.domain === targetDomain && s.normalizedScore !== null)
      .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())
      .slice(0, 5);

    const recentAvg = domainSessions.length > 0
      ? domainSessions.reduce((sum, s) => sum + (s.normalizedScore ?? 0), 0) / domainSessions.length
      : 50; // default to middle — no data means neutral difficulty

    // ── Step 3: Determine target difficulty ───────────────────────────────────
    const lastDifficulty = domainLastDifficulty[targetDomain] ?? 2;
    let targetDifficulty: number;
    if (recentAvg >= 75) {
      targetDifficulty = Math.min(5, lastDifficulty + 1);
    } else if (recentAvg < 45) {
      targetDifficulty = Math.max(1, lastDifficulty - 1);
    } else {
      targetDifficulty = lastDifficulty;
    }

    // ── Step 4: Select exercise ────────────────────────────────────────────────
    const candidates = EXERCISES.filter(e => e.domain === targetDomain);
    // Sort by distance from target difficulty, then by id for determinism
    candidates.sort((a, b) => {
      const da = Math.abs(a.difficulty - targetDifficulty);
      const db2 = Math.abs(b.difficulty - targetDifficulty);
      return da !== db2 ? da - db2 : a.id.localeCompare(b.id);
    });

    let exercise = candidates.find(e => e.id !== lastCompletedExerciseId);
    // Fallback: if all domain exercises were last played, pick any in domain
    if (!exercise) exercise = candidates[0];
    // Last-resort fallback: pick any exercise not last played
    if (!exercise) {
      exercise = EXERCISES.find(e => e.id !== lastCompletedExerciseId) ?? EXERCISES[0];
    }

    const [session] = await db.insert(exerciseSessions).values({
      userId,
      exerciseId: exercise.id,
      domain: exercise.domain as any,
      difficulty: exercise.difficulty,
    }).returning();

    return { exercise, sessionId: session.id };
  }
```

- [ ] **Step 4: Run all tests to verify they pass**

```bash
cd services/exercise-service && pnpm test
```

Expected: all existing tests + 3 new adaptive tests pass.

- [ ] **Step 5: Commit**

```bash
cd services/exercise-service
git add src/services/exercise.service.ts src/__tests__/exercises.test.ts
git commit -m "feat(exercise-service): replace round-robin with adaptive difficulty selection"
```

---

## Self-Review

**Spec coverage:**
- ✅ Prioritises domain with fewest completed sessions (Step 1)
- ✅ Uses last 5 sessions in domain for avg computation (Step 2)
- ✅ avg ≥ 75% → difficulty +1, capped at 5 (Step 3)
- ✅ avg < 45% → difficulty -1, floored at 1 (Step 3)
- ✅ 45–74% → same difficulty (Step 3)
- ✅ Never repeats last played exercise (Step 4)
- ✅ Fallback chain if domain exhausted (Step 4)
- ✅ New user (no sessions) handled — defaults to difficulty 2, memory domain first

**Placeholder scan:** No TBDs. All numeric thresholds (45, 75) are explicit constants in code. Difficulty bounds (1, 5) explicitly applied.

**Type consistency:** `DOMAIN_ORDER` uses `CognitiveDomain` type imported from `@cogniguard/types`. `targetDomain` inferred as `CognitiveDomain`. `exercise.domain as any` cast preserved from existing code for Drizzle enum compatibility.
