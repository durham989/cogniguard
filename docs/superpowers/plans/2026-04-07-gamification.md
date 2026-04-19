# Gamification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add streaks, levels, and per-domain badges to Preventia to reward consistent training and give users clear milestones to work toward.

**Architecture:** All gamification state is computed server-side from the existing `exercise_sessions` table in the exercise-service — no new DB tables needed. A new `GET /exercises/stats` endpoint returns streak, level, and domain badge data. The History screen's stats card is expanded to show streak and level; domain badges appear below it. Level and badge thresholds are defined as constants on the backend.

**Tech Stack:** exercise-service (Node/Express/Drizzle), mocha/chai/sinon (backend tests), React Native (mobile), Jest/RNTL (mobile tests)

---

## Definitions

**Streak:** Number of consecutive calendar days (UTC) on which the user completed at least one exercise. Today counts if at least one exercise was completed today. The streak resets to 0 if no exercise was completed yesterday or today.

**Level:** Total completed exercises → level via thresholds: 0=1, 10=2, 25=3, 50=4, 100=5, 200=6, 500=7. Displayed as "Level N" with a label (Beginner → Apprentice → Practitioner → Adept → Expert → Master → Legend).

**Domain Badges:** Per domain, one of four tiers based on number of completed sessions AND average normalized score:
- None (< 1 completed session)
- Bronze: ≥ 1 session
- Silver: ≥ 5 sessions AND avg score ≥ 50
- Gold: ≥ 10 sessions AND avg score ≥ 70
- Platinum: ≥ 20 sessions AND avg score ≥ 85

---

## File Map

- Modify: `services/exercise-service/src/services/exercise.service.ts` — add `getStats(userId)` function
- Modify: `services/exercise-service/src/routes/exercises.ts` — add `GET /exercises/stats` route
- Modify: `services/exercise-service/src/__tests__/exercises.test.ts` — add stats endpoint tests
- Modify: `apps/mobile/lib/api.ts` — add `api.exercises.stats`
- Modify: `apps/mobile/app/(tabs)/history.tsx` — expand stats card, add domain badges section

---

### Task 1: Implement getStats in exercise service

**Files:**
- Modify: `services/exercise-service/src/services/exercise.service.ts`

Background: `getStats` queries all completed sessions for a user, then computes streak, level, and per-domain badge tiers. All computed in-process from the returned rows.

Level thresholds (total completed → level number):

| Completed | Level | Label |
|---|---|---|
| 0–9 | 1 | Beginner |
| 10–24 | 2 | Apprentice |
| 25–49 | 3 | Practitioner |
| 50–99 | 4 | Adept |
| 100–199 | 5 | Expert |
| 200–499 | 6 | Master |
| 500+ | 7 | Legend |

- [ ] **Step 1: Write the failing tests**

In `services/exercise-service/src/__tests__/exercises.test.ts`, add a `makeStatsDb` helper and a `GET /exercises/stats` describe block after the existing `GET /exercises/history` describe block:

```typescript
// ─── GET /exercises/stats ─────────────────────────────────────────────────────

function makeStatsDb(sessions: Partial<ReturnType<typeof makeSession>>[] = []) {
  const { db } = makeDb();
  // getStats uses db.select().from().where() — reuse the orderByStub pattern
  // but we need a fresh chain for the stats query
  const resolvedSessions = sessions.map(s => makeSession(s as any));
  const whereStub = sinon.stub().resolves(resolvedSessions);
  db.select.returns({
    from: sinon.stub().returns({
      where: whereStub,
    }),
  });
  return { db, whereStub };
}

describe('GET /exercises/stats', () => {
  afterEach(() => sinon.restore());

  it('returns streak=0 and level 1 for user with no completed sessions', async () => {
    const { db } = makeStatsDb([]);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.streak).to.equal(0);
    expect(res.body.level).to.equal(1);
    expect(res.body.levelLabel).to.equal('Beginner');
    expect(res.body.domainBadges).to.be.an('object');
  });

  it('returns level 2 (Apprentice) when 10 sessions are completed', async () => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      completedAt: new Date(Date.now() - i * 86400000),
      normalizedScore: 60,
      domain: 'memory',
    }));
    const { db } = makeStatsDb(sessions);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.level).to.equal(2);
    expect(res.body.levelLabel).to.equal('Apprentice');
  });

  it('returns streak=1 when one session completed today', async () => {
    const { db } = makeStatsDb([{ completedAt: new Date(), normalizedScore: 50, domain: 'memory' }]);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.streak).to.equal(1);
  });

  it('returns silver badge for memory after 5 sessions with avg ≥ 50', async () => {
    const sessions = Array.from({ length: 5 }, (_, i) => ({
      completedAt: new Date(Date.now() - i * 86400000),
      normalizedScore: 65,
      domain: 'memory',
    }));
    const { db } = makeStatsDb(sessions);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.domainBadges.memory).to.equal('silver');
  });

  it('returns 401 without token', async () => {
    const { db } = makeStatsDb([]);
    const res = await request(createApp({ db })).get('/exercises/stats');
    expect(res.status).to.equal(401);
  });
});
```

Note: `makeSession`, `makeToken`, `makeDb`, and `createApp` are already defined in this test file. `makeSession` accepts a partial override object. Check the existing `makeSession` helper at the top of the file to confirm its signature before writing this test, and adjust the `makeStatsDb` stub chain to match how `getHistory` queries the DB (it uses `db.select().from().where().orderBy()` — stats only needs `where()`, no `orderBy()`).

- [ ] **Step 2: Run to verify tests fail**

```bash
cd services/exercise-service && pnpm test 2>&1 | tail -20
```

Expected: 5 new failing tests.

- [ ] **Step 3: Implement getStats**

In `services/exercise-service/src/services/exercise.service.ts`, add the following constants and function. Add the constants before `createExerciseService`:

```typescript
const LEVEL_THRESHOLDS = [
  { min: 500, level: 7, label: 'Legend' },
  { min: 200, level: 6, label: 'Master' },
  { min: 100, level: 5, label: 'Expert' },
  { min: 50, level: 4, label: 'Adept' },
  { min: 25, level: 3, label: 'Practitioner' },
  { min: 10, level: 2, label: 'Apprentice' },
  { min: 0, level: 1, label: 'Beginner' },
];

const BADGE_TIERS = [
  { tier: 'platinum', minSessions: 20, minAvg: 85 },
  { tier: 'gold', minSessions: 10, minAvg: 70 },
  { tier: 'silver', minSessions: 5, minAvg: 50 },
  { tier: 'bronze', minSessions: 1, minAvg: 0 },
] as const;

export type BadgeTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface UserStats {
  streak: number;
  level: number;
  levelLabel: string;
  nextLevelAt: number | null;
  domainBadges: Record<string, BadgeTier>;
}
```

Add `getStats` inside `createExerciseService`, before the `return` statement:

```typescript
  async function getStats(userId: string): Promise<UserStats> {
    const completed = await db
      .select()
      .from(exerciseSessions)
      .where(and(eq(exerciseSessions.userId, userId), isNotNull(exerciseSessions.completedAt)));

    // ── Level ────────────────────────────────────────────────────────────────
    const totalCompleted = completed.length;
    const levelEntry = LEVEL_THRESHOLDS.find(t => totalCompleted >= t.min)!;
    const nextThreshold = LEVEL_THRESHOLDS
      .slice()
      .reverse()
      .find(t => t.level === levelEntry.level + 1) ?? null;
    const nextLevelAt = nextThreshold ? nextThreshold.min : null;

    // ── Streak ───────────────────────────────────────────────────────────────
    const todayUtc = new Date().toISOString().slice(0, 10);
    const daySet = new Set(
      completed
        .filter(s => s.completedAt)
        .map(s => s.completedAt!.toISOString().slice(0, 10))
    );

    let streak = 0;
    const cursor = new Date();
    // Start counting from today; if today has no session, check yesterday first
    if (!daySet.has(todayUtc)) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    while (daySet.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    // ── Domain Badges ────────────────────────────────────────────────────────
    const domainMap: Record<string, { count: number; totalScore: number }> = {};
    for (const s of completed) {
      if (!domainMap[s.domain]) domainMap[s.domain] = { count: 0, totalScore: 0 };
      domainMap[s.domain].count++;
      domainMap[s.domain].totalScore += s.normalizedScore ?? 0;
    }

    const domainBadges: Record<string, BadgeTier> = {};
    for (const [domain, { count, totalScore }] of Object.entries(domainMap)) {
      const avg = totalScore / count;
      const badge = BADGE_TIERS.find(t => count >= t.minSessions && avg >= t.minAvg);
      domainBadges[domain] = badge ? badge.tier : 'none';
    }

    return { streak, level: levelEntry.level, levelLabel: levelEntry.label, nextLevelAt, domainBadges };
  }
```

Add `getStats` to the return object at the bottom of `createExerciseService`:

```typescript
  return { getNextExercise, submitExercise, getHistory, scoreStandalone, getStats };
```

Also add `isNotNull` to the import at the top of the file (it's already imported for `getNextExercise`; confirm it's there).

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd services/exercise-service && pnpm test
```

Expected: all existing tests + 5 new tests pass.

- [ ] **Step 5: Commit**

```bash
cd services/exercise-service
git add src/services/exercise.service.ts src/__tests__/exercises.test.ts
git commit -m "feat(exercise-service): add getStats with streak, level, and domain badges"
```

---

### Task 2: Add GET /exercises/stats route

**Files:**
- Modify: `services/exercise-service/src/routes/exercises.ts`

- [ ] **Step 1: Add the route**

In `services/exercise-service/src/routes/exercises.ts`, inside `createExercisesRouter`, add the following route after the existing `GET /history` handler:

```typescript
  router.get('/stats', async (req, res: Response) => {
    const { userId } = req as AuthRequest;
    const stats = await exerciseService.getStats(userId);
    return res.json(stats);
  });
```

- [ ] **Step 2: Run tests to verify they still pass**

```bash
cd services/exercise-service && pnpm test
```

Expected: all tests pass (the stats tests from Task 1 now test through the full route).

- [ ] **Step 3: Commit**

```bash
cd services/exercise-service
git add src/routes/exercises.ts
git commit -m "feat(exercise-service): expose GET /exercises/stats endpoint"
```

---

### Task 3: Add stats API call to mobile

**Files:**
- Modify: `apps/mobile/lib/api.ts`

- [ ] **Step 1: Add the API method**

In `apps/mobile/lib/api.ts`, add the following inside the `exercises` object, after `scoreStandalone`:

```typescript
    stats: (token: string) =>
      request<{
        streak: number;
        level: number;
        levelLabel: string;
        nextLevelAt: number | null;
        domainBadges: Record<string, 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'>;
      }>(`${API.exercise}/exercises/stats`, { token }),
```

- [ ] **Step 2: Commit**

```bash
cd apps/mobile
git add lib/api.ts
git commit -m "feat(mobile): add exercises.stats API call"
```

---

### Task 4: Expand History stats card with streak and level

**Files:**
- Modify: `apps/mobile/app/(tabs)/history.tsx`

Background: The current `StatsCard` shows Completed / Avg Score / Best Domain. Replace it with a richer card: Streak (with flame-style color if > 0), Level + label, Completed count, Avg Score. Fetch `api.exercises.stats` alongside the existing data load in `loadData`.

- [ ] **Step 1: Update the History screen**

Replace the `StatsCard` component and update `loadData` in `apps/mobile/app/(tabs)/history.tsx`:

Add a `stats` state variable at the top of `HistoryScreen`:

```typescript
  const [stats, setStats] = useState<{
    streak: number;
    level: number;
    levelLabel: string;
    nextLevelAt: number | null;
    domainBadges: Record<string, 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'>;
  } | null>(null);
```

Update `loadData` to also fetch stats:

```typescript
  const loadData = useCallback(async (isRefresh = false) => {
    if (!token) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [convs, exs, userStats] = await Promise.all([
        api.conversations.list(token),
        api.exercises.history(token) as Promise<ExerciseSession[]>,
        api.exercises.stats(token),
      ]);
      setConversations(convs);
      setExercises(exs);
      setStats(userStats);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);
```

Replace the `StatsCard` component entirely:

```typescript
function StatsCard({
  sessions,
  streak,
  level,
  levelLabel,
  nextLevelAt,
}: {
  sessions: ExerciseSession[];
  streak: number;
  level: number;
  levelLabel: string;
  nextLevelAt: number | null;
}) {
  const completed = sessions.filter(s => s.completedAt && s.normalizedScore !== null);
  const avg = completed.length > 0
    ? Math.round(completed.reduce((sum, s) => sum + (s.normalizedScore ?? 0), 0) / completed.length)
    : null;

  const nextLevelProgress = nextLevelAt
    ? Math.min(1, completed.length / nextLevelAt)
    : 1;

  return (
    <View style={styles.statsCard}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, streak > 0 && { color: '#ff9f0a' }]}>
            {streak}
          </Text>
          <Text style={styles.statLabel}>{streak === 1 ? 'Day Streak' : 'Day Streak'}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{completed.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{avg !== null ? `${avg}%` : '—'}</Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
      </View>
      <View style={styles.levelRow}>
        <View style={styles.levelTextRow}>
          <Text style={styles.levelLabel}>Level {level} · {levelLabel}</Text>
          {nextLevelAt && (
            <Text style={styles.levelSubtext}>{completed.length}/{nextLevelAt}</Text>
          )}
        </View>
        <View style={styles.levelTrack}>
          <View style={[styles.levelFill, { width: `${Math.round(nextLevelProgress * 100)}%` }]} />
        </View>
      </View>
    </View>
  );
}
```

Update the `renderItem` call that renders `stats` in the `SectionList` to pass the new props. Find the line that renders `{ kind: 'stats' }` and replace:

```typescript
        if (item.kind === 'stats') {
          return (
            <StatsCard
              sessions={exercises}
              streak={stats?.streak ?? 0}
              level={stats?.level ?? 1}
              levelLabel={stats?.levelLabel ?? 'Beginner'}
              nextLevelAt={stats?.nextLevelAt ?? 10}
            />
          );
        }
```

Add the new styles to `StyleSheet.create`:

```typescript
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  levelRow: { gap: 6 },
  levelTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  levelSubtext: { color: '#8e8e93', fontSize: 12 },
  levelTrack: {
    height: 6, backgroundColor: '#2a2a4a', borderRadius: 3, overflow: 'hidden',
  },
  levelFill: {
    height: 6, backgroundColor: '#6c63ff', borderRadius: 3,
  },
```

Also update the existing `statsCard` style to remove `justifyContent: 'space-around'` and `alignItems: 'center'` from the card-level since the rows now handle that:

```typescript
  statsCard: {
    backgroundColor: '#1e1e3a',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
```

- [ ] **Step 2: Commit**

```bash
cd apps/mobile
git add app/(tabs)/history.tsx
git commit -m "feat(mobile): expand stats card with streak, level, and XP progress bar"
```

---

### Task 5: Add domain badges section to History screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/history.tsx`

Background: Below the stats card and above the exercises list, show a horizontal row of domain badge cards. Each domain shows its name, badge tier, and a colored indicator. Domains with no sessions (badge = 'none') are shown as locked/grey.

- [ ] **Step 1: Add the DomainBadges component**

Add the following component to `apps/mobile/app/(tabs)/history.tsx`, after the `StatsCard` component:

```typescript
const BADGE_COLORS: Record<string, string> = {
  platinum: '#e5e4e2',
  gold: '#ffd60a',
  silver: '#c0c0c0',
  bronze: '#cd7f32',
  none: '#2a2a4a',
};

const BADGE_LABELS: Record<string, string> = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze',
  none: 'Locked',
};

const DOMAINS_ORDER = ['memory', 'attention', 'processing_speed', 'executive_function', 'language', 'visuospatial'];

function DomainBadges({ domainBadges }: { domainBadges: Record<string, 'none' | 'bronze' | 'silver' | 'gold' | 'platinum'> }) {
  return (
    <View style={styles.badgesContainer}>
      <Text style={styles.badgesTitle}>Domain Badges</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
        {DOMAINS_ORDER.map(domain => {
          const tier = domainBadges[domain] ?? 'none';
          const color = BADGE_COLORS[tier];
          const locked = tier === 'none';
          return (
            <View key={domain} style={[styles.badgeCard, locked && styles.badgeCardLocked]}>
              <View style={[styles.badgeDot, { backgroundColor: color }]} />
              <Text style={[styles.badgeDomain, locked && styles.badgeDomainLocked]} numberOfLines={1}>
                {DOMAIN_LABELS[domain]?.split(' ')[0] ?? domain}
              </Text>
              <Text style={[styles.badgeTier, { color }]}>{BADGE_LABELS[tier]}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
```

Add the `ScrollView` import to the existing React Native import list at the top of the file (it may already be there — check before adding).

Add the badge styles to `StyleSheet.create`:

```typescript
  badgesContainer: { marginBottom: 16 },
  badgesTitle: {
    color: '#8e8e93', fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 10,
  },
  badgesScroll: { gap: 8, paddingRight: 4 },
  badgeCard: {
    backgroundColor: '#1e1e3a', borderRadius: 12, padding: 12,
    alignItems: 'center', width: 80, gap: 6,
  },
  badgeCardLocked: { opacity: 0.4 },
  badgeDot: { width: 24, height: 24, borderRadius: 12 },
  badgeDomain: { color: '#fff', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  badgeDomainLocked: { color: '#666' },
  badgeTier: { fontSize: 10, fontWeight: '500' },
```

- [ ] **Step 2: Wire DomainBadges into the SectionList data**

Add a new `{ kind: 'badges' }` item type to `RowItem` and insert it after `{ kind: 'stats' }` in the first section's data:

```typescript
  type RowItem =
    | { kind: 'stats' }
    | { kind: 'badges' }
    | { kind: 'ex'; data: ExerciseSession }
    | { kind: 'conv'; data: ConversationSummary };

  const sections: Array<{ title: string; data: RowItem[] }> = [
    {
      title: '',
      data: [
        { kind: 'stats' },
        { kind: 'badges' },
        ...completedExercises.map(d => ({ kind: 'ex' as const, data: d })),
      ],
    },
    // ... conversations section unchanged
  ];
```

Add the render case in `renderItem`:

```typescript
        if (item.kind === 'badges') {
          return <DomainBadges domainBadges={stats?.domainBadges ?? {}} />;
        }
```

Update the `keyExtractor` to handle the new kind:

```typescript
      keyExtractor={(item, index) =>
        item.kind === 'stats' ? 'stats' :
        item.kind === 'badges' ? 'badges' :
        item.data.id
      }
```

- [ ] **Step 3: Run mobile tests**

```bash
cd apps/mobile && pnpm test
```

Expected: all existing tests pass (no new tests needed — this is display-only logic driven by server data).

- [ ] **Step 4: Commit**

```bash
cd apps/mobile
git add app/(tabs)/history.tsx
git commit -m "feat(mobile): add domain badge cards to History screen"
```

---

## Self-Review

**Spec coverage:**
- ✅ Streak: consecutive days with ≥1 completed exercise (Task 1)
- ✅ Level 1–7 with label, XP progress bar to next level (Tasks 1, 4)
- ✅ Domain badges: bronze/silver/gold/platinum based on session count + avg score (Tasks 1, 5)
- ✅ All computed server-side, no new DB tables (Task 1)
- ✅ `GET /exercises/stats` route (Task 2)
- ✅ Mobile API call (Task 3)
- ✅ Stats card updated with streak (orange when > 0) + level + progress bar (Task 4)
- ✅ Horizontal domain badge row, locked domains dimmed (Task 5)

**Placeholder scan:** No TBDs. All styles, threshold values, and tier logic are fully specified.

**Type consistency:** `BadgeTier` type defined in exercise.service.ts and matched literally in api.ts as `'none' | 'bronze' | 'silver' | 'gold' | 'platinum'`. `domainBadges` is `Record<string, BadgeTier>` throughout. `LEVEL_THRESHOLDS` and `BADGE_TIERS` arrays defined once, used only in `getStats`.
