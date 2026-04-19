# Longitudinal Trends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an 8-week per-domain trend chart in the History screen so users can see whether they are improving, plateauing, or declining over time.

**Architecture:** A new `GET /exercises/trends` endpoint aggregates completed sessions into ISO-week buckets per domain and returns weekly averages. The History screen renders a small custom bar chart per domain using plain React Native Views — no charting library dependency. Only domains with at least one completed session are shown.

**Tech Stack:** exercise-service (Node/Express/Drizzle), mocha/chai/sinon/supertest (backend tests), React Native (mobile)

---

## File Map

- Modify: `services/exercise-service/src/services/exercise.service.ts` — add `getTrends(userId)`
- Modify: `services/exercise-service/src/routes/exercises.ts` — add `GET /exercises/trends`
- Modify: `services/exercise-service/src/__tests__/exercises.test.ts` — add trends tests
- Modify: `apps/mobile/lib/api.ts` — add `api.exercises.trends`
- Modify: `apps/mobile/app/(tabs)/history.tsx` — add `TrendChart` component and section

---

### Task 1: Implement getTrends in exercise service

**Files:**
- Modify: `services/exercise-service/src/services/exercise.service.ts`

Background: `getTrends` fetches all completed sessions, groups them by `(domain, ISO week)`, and computes weekly average `normalizedScore`. Returns the last 8 weeks where data exists, one entry per domain. ISO week string format: `"2026-W14"`.

- [ ] **Step 1: Write the failing tests**

In `services/exercise-service/src/__tests__/exercises.test.ts`, add a `makeTrendsDb` helper and a `GET /exercises/trends` describe block after the existing `GET /exercises/stats` block:

```typescript
// ─── GET /exercises/trends ────────────────────────────────────────────────────

function makeTrendsDb(sessions: Partial<ReturnType<typeof makeSession>>[] = []) {
  const { db } = makeDb();
  const resolved = sessions.map(s => makeSession(s as any));
  db.select.returns({
    from: sinon.stub().returns({
      where: sinon.stub().resolves(resolved),
    }),
  });
  return { db };
}

describe('GET /exercises/trends', () => {
  afterEach(() => sinon.restore());

  it('returns empty array when user has no completed sessions', async () => {
    const { db } = makeTrendsDb([]);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/trends')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal([]);
  });

  it('returns domain trends grouped by week', async () => {
    const monday = new Date('2026-04-06'); // Monday of week 15
    const { db } = makeTrendsDb([
      { completedAt: monday, normalizedScore: 60, domain: 'memory' },
      { completedAt: monday, normalizedScore: 80, domain: 'memory' },
    ]);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/trends')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    const memoryTrend = res.body.find((t: any) => t.domain === 'memory');
    expect(memoryTrend).to.exist;
    expect(memoryTrend.weeks).to.be.an('array');
    expect(memoryTrend.weeks[0].avg).to.equal(70); // (60+80)/2
    expect(memoryTrend.weeks[0].count).to.equal(2);
  });

  it('returns 401 without token', async () => {
    const { db } = makeTrendsDb([]);
    const res = await request(createApp({ db })).get('/exercises/trends');
    expect(res.status).to.equal(401);
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
cd services/exercise-service && pnpm test 2>&1 | tail -20
```

Expected: 3 new failing tests.

- [ ] **Step 3: Implement getTrends**

In `services/exercise-service/src/services/exercise.service.ts`, add the `isoWeek` helper and `getTrends` function before the `return` statement of `createExerciseService`:

```typescript
export interface WeeklyAverage {
  weekStart: string;  // ISO week string e.g. "2026-W14"
  avg: number;
  count: number;
}

export interface DomainTrend {
  domain: string;
  weeks: WeeklyAverage[];
}

function isoWeek(date: Date): string {
  // Returns "YYYY-Www" for the ISO week containing `date`
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Sun=0 → 7
  d.setUTCDate(d.getUTCDate() + 4 - day); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function getTrends(userId: string): Promise<DomainTrend[]> {
  const completed = await db
    .select()
    .from(exerciseSessions)
    .where(and(eq(exerciseSessions.userId, userId), isNotNull(exerciseSessions.completedAt)));

  // Group by domain → week
  const map: Record<string, Record<string, { total: number; count: number }>> = {};
  for (const s of completed) {
    if (s.normalizedScore === null || !s.completedAt) continue;
    const week = isoWeek(s.completedAt);
    if (!map[s.domain]) map[s.domain] = {};
    if (!map[s.domain][week]) map[s.domain][week] = { total: 0, count: 0 };
    map[s.domain][week].total += s.normalizedScore;
    map[s.domain][week].count += 1;
  }

  // Keep only the last 8 weeks per domain, sorted ascending
  return Object.entries(map).map(([domain, weeks]) => {
    const sorted = Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([weekStart, { total, count }]) => ({
        weekStart,
        avg: Math.round(total / count),
        count,
      }));
    return { domain, weeks: sorted };
  });
}
```

Add `getTrends` to the return object:

```typescript
  return { getNextExercise, submitExercise, getHistory, scoreStandalone, getStats, getTrends };
```

- [ ] **Step 4: Add the route**

In `services/exercise-service/src/routes/exercises.ts`, after the `GET /history` handler, add:

```typescript
  router.get('/trends', async (req, res: Response) => {
    const { userId } = req as unknown as AuthRequest;
    const trends = await exerciseService.getTrends(userId);
    return res.json(trends);
  });
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd services/exercise-service && pnpm test
```

Expected: all existing tests + 3 new tests pass.

- [ ] **Step 6: Commit**

```bash
cd services/exercise-service
git add src/services/exercise.service.ts src/routes/exercises.ts src/__tests__/exercises.test.ts
git commit -m "feat(exercise-service): add GET /exercises/trends endpoint with weekly domain aggregation"
```

---

### Task 2: Add trends API call and render chart in History screen

**Files:**
- Modify: `apps/mobile/lib/api.ts`
- Modify: `apps/mobile/app/(tabs)/history.tsx`

Background: The trend chart is a simple horizontal bar chart per domain, showing the last 8 weeks as bars scaled to 0–100. Domains with no data are not shown. The chart lives in a `TrendSection` component rendered between the domain badges and the exercises list (after the `{ kind: 'badges' }` row if gamification is also implemented, otherwise after `{ kind: 'stats' }`).

Note: If the gamification plan has not yet been executed, the `{ kind: 'badges' }` row will not exist. Insert `{ kind: 'trends' }` directly after `{ kind: 'stats' }` in that case.

- [ ] **Step 1: Add the API method**

In `apps/mobile/lib/api.ts`, add inside the `exercises` object after `scoreStandalone`:

```typescript
    trends: (token: string) =>
      request<Array<{ domain: string; weeks: Array<{ weekStart: string; avg: number; count: number }> }>>(
        `${API.exercise}/exercises/trends`,
        { token },
      ),
```

- [ ] **Step 2: Add TrendSection component**

In `apps/mobile/app/(tabs)/history.tsx`, add the following imports at the top alongside existing ones (if not already present):

```typescript
import { ScrollView } from 'react-native';
```

Add the `TrendSection` component before `HistoryScreen`:

```typescript
const DOMAIN_ORDER = ['memory', 'attention', 'processing_speed', 'executive_function', 'language', 'visuospatial'];

function TrendBar({ avg, isLast }: { avg: number; isLast: boolean }) {
  const color = avg >= 70 ? '#7a9e7a' : avg >= 40 ? '#c8a84a' : '#b05848';
  return (
    <View style={trendStyles.barCol}>
      <View style={trendStyles.barTrack}>
        <View style={[trendStyles.barFill, { height: `${avg}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function TrendSection({ trends }: { trends: Array<{ domain: string; weeks: Array<{ weekStart: string; avg: number; count: number }> }> }) {
  if (trends.length === 0) return null;

  const ordered = DOMAIN_ORDER
    .map(d => trends.find(t => t.domain === d))
    .filter(Boolean) as typeof trends;

  return (
    <View style={trendStyles.container}>
      <Text style={trendStyles.heading}>8-Week Trends</Text>
      {ordered.map(({ domain, weeks }) => (
        <View key={domain} style={trendStyles.row}>
          <Text style={trendStyles.domainLabel} numberOfLines={1}>
            {DOMAIN_LABELS[domain]?.split(' ')[0] ?? domain}
          </Text>
          <View style={trendStyles.bars}>
            {weeks.map((w, i) => (
              <TrendBar key={w.weekStart} avg={w.avg} isLast={i === weeks.length - 1} />
            ))}
          </View>
          <Text style={trendStyles.latestScore}>
            {weeks[weeks.length - 1]?.avg ?? '—'}%
          </Text>
        </View>
      ))}
    </View>
  );
}

const trendStyles = StyleSheet.create({
  container: { marginBottom: 16 },
  heading: {
    color: '#9a9080', fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 10,
  },
  row: {
    flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10, gap: 8,
  },
  domainLabel: {
    color: '#c0b8a8', fontSize: 11, width: 60, marginBottom: 2,
  },
  bars: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end', height: 32, gap: 2,
  },
  barCol: { flex: 1, height: 32, justifyContent: 'flex-end' },
  barTrack: {
    flex: 1, backgroundColor: '#2e2b20', borderRadius: 2, overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: { borderRadius: 2, minHeight: 2 },
  latestScore: {
    color: '#ede5d0', fontSize: 12, fontWeight: '600', width: 32, textAlign: 'right',
  },
});
```

- [ ] **Step 3: Wire trends into loadData and SectionList**

In `HistoryScreen`, add a `trends` state variable alongside `stats`:

```typescript
  const [trends, setTrends] = useState<Array<{ domain: string; weeks: Array<{ weekStart: string; avg: number; count: number }> }>>([]);
```

Update `loadData` to fetch trends in parallel:

```typescript
      const [convs, exs, userStats, userTrends] = await Promise.all([
        api.conversations.list(token),
        api.exercises.history(token) as Promise<ExerciseSession[]>,
        api.exercises.stats(token),
        api.exercises.trends(token),
      ]);
      setConversations(convs);
      setExercises(exs);
      setStats(userStats);
      setTrends(userTrends);
```

Add `{ kind: 'trends' }` to `RowItem`:

```typescript
  type RowItem =
    | { kind: 'stats' }
    | { kind: 'badges' }
    | { kind: 'trends' }
    | { kind: 'ex'; data: ExerciseSession }
    | { kind: 'conv'; data: ConversationSummary };
```

Insert `{ kind: 'trends' }` into the first section's data after `{ kind: 'badges' }` (or after `{ kind: 'stats' }` if badges are not yet implemented):

```typescript
      data: [
        { kind: 'stats' },
        { kind: 'badges' },   // remove this line if gamification plan not yet executed
        { kind: 'trends' },
        ...completedExercises.map(d => ({ kind: 'ex' as const, data: d })),
      ],
```

Add the render case in `renderItem`:

```typescript
        if (item.kind === 'trends') {
          return <TrendSection trends={trends} />;
        }
```

Update `keyExtractor` to handle `'trends'`:

```typescript
      keyExtractor={(item) =>
        item.kind === 'stats' ? 'stats' :
        item.kind === 'badges' ? 'badges' :
        item.kind === 'trends' ? 'trends' :
        item.data.id
      }
```

- [ ] **Step 4: Commit**

```bash
cd apps/mobile
git add lib/api.ts app/(tabs)/history.tsx
git commit -m "feat(mobile): add 8-week per-domain trend chart to History screen"
```

---

## Self-Review

**Spec coverage:**
- ✅ 8-week rolling window per domain (Task 1)
- ✅ Weekly avg + count computed server-side (Task 1)
- ✅ `GET /exercises/trends` route (Task 1)
- ✅ Color-coded bar chart (sage/amber/brick) matching score threshold (Task 2)
- ✅ Domains ordered consistently (Task 2)
- ✅ Latest week score shown as number (Task 2)
- ✅ No chart library dependency — plain Views

**Placeholder scan:** No TBDs. `isoWeek()` implementation is complete and handles Sun=0 edge case. Bar height uses percentage string cast to `any` — acceptable pattern for RN dynamic styles.

**Type consistency:** `DomainTrend` and `WeeklyAverage` exported from exercise.service; api.ts return type matches exactly.
