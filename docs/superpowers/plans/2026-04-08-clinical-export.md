# Clinical Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users generate a formatted cognitive performance report from the History screen and share it via the native iOS/Android share sheet — suitable for showing to a GP or specialist.

**Architecture:** A new `GET /exercises/report` endpoint returns structured JSON covering the user's full performance history. The mobile app formats this into a readable plain-text report and invokes `Share.share()` from React Native's core `Share` API — no PDF library needed for Phase 1. The report includes summary stats, per-domain breakdown with trend direction, a list of the 10 most recent exercises, and a disclaimer.

**Tech Stack:** exercise-service (Node/Express/Drizzle), React Native `Share` API (mobile)

---

## File Map

- Modify: `services/exercise-service/src/services/exercise.service.ts` — add `generateReport(userId)`
- Modify: `services/exercise-service/src/routes/exercises.ts` — add `GET /exercises/report`
- Modify: `services/exercise-service/src/__tests__/exercises.test.ts` — add report tests
- Modify: `apps/mobile/lib/api.ts` — add `api.exercises.report`
- Modify: `apps/mobile/app/(tabs)/history.tsx` — add Export button and share logic

---

### Task 1: Implement generateReport in exercise service

**Files:**
- Modify: `services/exercise-service/src/services/exercise.service.ts`
- Modify: `services/exercise-service/src/routes/exercises.ts`
- Modify: `services/exercise-service/src/__tests__/exercises.test.ts`

Background: The report aggregates the same data already computed across `getStats` and `getTrends`, but structured for human reading. It returns a JSON payload that the mobile client formats into a shareable string.

- [ ] **Step 1: Write the failing tests**

In `services/exercise-service/src/__tests__/exercises.test.ts`, add after the existing `GET /exercises/trends` block:

```typescript
// ─── GET /exercises/report ────────────────────────────────────────────────────

describe('GET /exercises/report', () => {
  afterEach(() => sinon.restore());

  it('returns a structured report for a user with sessions', async () => {
    const sessions = Array.from({ length: 5 }, (_, i) =>
      makeSession({
        domain: i < 3 ? 'memory' : 'attention',
        normalizedScore: 70,
        completedAt: new Date(Date.now() - i * 86400000),
      })
    );
    const { db } = makeTrendsDb(sessions); // reuse makeTrendsDb — same stub shape
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/report')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('generatedAt');
    expect(res.body).to.have.property('summary');
    expect(res.body.summary).to.have.property('totalCompleted');
    expect(res.body.summary).to.have.property('avgScore');
    expect(res.body).to.have.property('domains');
    expect(res.body).to.have.property('recentSessions');
    expect(res.body.recentSessions).to.be.an('array');
  });

  it('returns empty report for user with no sessions', async () => {
    const { db } = makeTrendsDb([]);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/report')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.summary.totalCompleted).to.equal(0);
    expect(res.body.domains).to.deep.equal([]);
    expect(res.body.recentSessions).to.deep.equal([]);
  });

  it('returns 401 without token', async () => {
    const { db } = makeTrendsDb([]);
    const res = await request(createApp({ db })).get('/exercises/report');
    expect(res.status).to.equal(401);
  });
});
```

- [ ] **Step 2: Run to verify tests fail**

```bash
cd services/exercise-service && pnpm test 2>&1 | tail -20
```

Expected: 3 new failing tests.

- [ ] **Step 3: Implement generateReport**

In `services/exercise-service/src/services/exercise.service.ts`, add the following types and function before the `return` statement of `createExerciseService`:

```typescript
export interface DomainReport {
  domain: string;
  sessionCount: number;
  avgScore: number;
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
}

export interface RecentSessionReport {
  exerciseId: string;
  domain: string;
  normalizedScore: number;
  completedAt: string;
}

export interface CognitiveReport {
  generatedAt: string;
  summary: {
    totalCompleted: number;
    avgScore: number | null;
    streakDays: number;
    firstSessionAt: string | null;
  };
  domains: DomainReport[];
  recentSessions: RecentSessionReport[];
}

async function generateReport(userId: string): Promise<CognitiveReport> {
  const completed = await db
    .select()
    .from(exerciseSessions)
    .where(and(eq(exerciseSessions.userId, userId), isNotNull(exerciseSessions.completedAt)));

  const totalCompleted = completed.length;
  const avgScore = totalCompleted > 0
    ? Math.round(completed.reduce((sum, s) => sum + (s.normalizedScore ?? 0), 0) / totalCompleted)
    : null;

  // Streak (reuse logic from getStats inline)
  const todayUtc = new Date().toISOString().slice(0, 10);
  const daySet = new Set(completed.filter(s => s.completedAt).map(s => s.completedAt!.toISOString().slice(0, 10)));
  let streakDays = 0;
  const cursor = new Date();
  if (!daySet.has(todayUtc)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streakDays++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const firstSessionAt = completed.length > 0
    ? completed.sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())[0].startedAt.toISOString()
    : null;

  // Domain breakdown
  const domainMap: Record<string, { scores: number[]; timestamps: number[] }> = {};
  for (const s of completed) {
    if (!domainMap[s.domain]) domainMap[s.domain] = { scores: [], timestamps: [] };
    domainMap[s.domain].scores.push(s.normalizedScore ?? 0);
    domainMap[s.domain].timestamps.push(s.completedAt!.getTime());
  }

  const domains: DomainReport[] = Object.entries(domainMap).map(([domain, { scores, timestamps }]) => {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    let trend: DomainReport['trend'] = 'insufficient_data';
    if (scores.length >= 4) {
      // Compare avg of first half vs second half
      const mid = Math.floor(scores.length / 2);
      const firstHalfAvg = scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
      const secondHalfAvg = scores.slice(mid).reduce((a, b) => a + b, 0) / (scores.length - mid);
      const delta = secondHalfAvg - firstHalfAvg;
      trend = delta > 5 ? 'improving' : delta < -5 ? 'declining' : 'stable';
    }
    return { domain, sessionCount: scores.length, avgScore: avg, trend };
  });

  // Most recent 10 sessions
  const recentSessions: RecentSessionReport[] = completed
    .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())
    .slice(0, 10)
    .map(s => ({
      exerciseId: s.exerciseId,
      domain: s.domain,
      normalizedScore: Math.round(s.normalizedScore ?? 0),
      completedAt: s.completedAt!.toISOString(),
    }));

  return {
    generatedAt: new Date().toISOString(),
    summary: { totalCompleted, avgScore, streakDays, firstSessionAt },
    domains,
    recentSessions,
  };
}
```

Add `generateReport` to the return object:

```typescript
  return { getNextExercise, submitExercise, getHistory, scoreStandalone, getStats, getTrends, generateReport };
```

- [ ] **Step 4: Add the route**

In `services/exercise-service/src/routes/exercises.ts`, after the `GET /trends` handler:

```typescript
  router.get('/report', async (req, res: Response) => {
    const { userId } = req as unknown as AuthRequest;
    const report = await exerciseService.generateReport(userId);
    return res.json(report);
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
git commit -m "feat(exercise-service): add GET /exercises/report for clinical export"
```

---

### Task 2: Add Export button to History screen

**Files:**
- Modify: `apps/mobile/lib/api.ts`
- Modify: `apps/mobile/app/(tabs)/history.tsx`

Background: The Export button appears at the bottom of the History screen. Tapping it fetches the report, formats it as a plain-text string, and invokes `Share.share()`. The format includes a header, summary section, per-domain table, and the 10 most recent sessions. A disclaimer appears at the bottom.

- [ ] **Step 1: Add the API method**

In `apps/mobile/lib/api.ts`, add inside the `exercises` object after `trends`:

```typescript
    report: (token: string) =>
      request<{
        generatedAt: string;
        summary: { totalCompleted: number; avgScore: number | null; streakDays: number; firstSessionAt: string | null };
        domains: Array<{ domain: string; sessionCount: number; avgScore: number; trend: string }>;
        recentSessions: Array<{ exerciseId: string; domain: string; normalizedScore: number; completedAt: string }>;
      }>(`${API.exercise}/exercises/report`, { token }),
```

- [ ] **Step 2: Add the Export button and share logic to HistoryScreen**

Add `Share` to the React Native imports at the top of `apps/mobile/app/(tabs)/history.tsx`:

```typescript
import { ..., Share } from 'react-native';
```

Add an `exporting` state variable in `HistoryScreen`:

```typescript
  const [exporting, setExporting] = useState(false);
```

Add the `handleExport` function inside `HistoryScreen`, after `resumeConversation`:

```typescript
  const handleExport = useCallback(async () => {
    if (!token) return;
    setExporting(true);
    try {
      const r = await api.exercises.report(token);

      const DOMAIN_LABELS_FULL: Record<string, string> = {
        memory: 'Memory', attention: 'Attention', processing_speed: 'Processing Speed',
        executive_function: 'Executive Function', language: 'Language', visuospatial: 'Visuospatial',
      };
      const TREND_ARROWS: Record<string, string> = {
        improving: 'improving', declining: 'declining', stable: 'stable', insufficient_data: 'insufficient data',
      };

      const date = new Date(r.generatedAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      const since = r.summary.firstSessionAt
        ? new Date(r.summary.firstSessionAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';

      const domainLines = r.domains.length > 0
        ? r.domains
            .sort((a, b) => b.avgScore - a.avgScore)
            .map(d => `  ${(DOMAIN_LABELS_FULL[d.domain] ?? d.domain).padEnd(22)} ${String(d.avgScore).padStart(3)}%  (${d.sessionCount} sessions, ${TREND_ARROWS[d.trend] ?? d.trend})`)
            .join('\n')
        : '  No domain data available';

      const sessionLines = r.recentSessions.length > 0
        ? r.recentSessions.map((s, i) => {
            const dStr = new Date(s.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            return `  ${String(i + 1).padStart(2)}. ${dStr}  ${(DOMAIN_LABELS_FULL[s.domain] ?? s.domain).padEnd(22)} ${s.normalizedScore}%`;
          }).join('\n')
        : '  No sessions yet';

      const text = [
        'PREVENTIA COGNITIVE PERFORMANCE REPORT',
        `Generated: ${date}`,
        `Training since: ${since}`,
        '',
        '── SUMMARY ─────────────────────────────',
        `  Sessions completed:  ${r.summary.totalCompleted}`,
        `  Overall average:     ${r.summary.avgScore !== null ? r.summary.avgScore + '%' : 'N/A'}`,
        `  Current streak:      ${r.summary.streakDays} day${r.summary.streakDays === 1 ? '' : 's'}`,
        '',
        '── DOMAIN BREAKDOWN ─────────────────────',
        domainLines,
        '',
        '── RECENT SESSIONS (last 10) ────────────',
        sessionLines,
        '',
        '── DISCLAIMER ───────────────────────────',
        'This report is generated by Preventia, a verbal cognitive training app.',
        'It is not a medical assessment, diagnosis, or clinical evaluation.',
        'Please consult a qualified healthcare professional for medical advice.',
      ].join('\n');

      await Share.share({ message: text, title: 'Preventia Cognitive Report' });
    } catch {
      // Share cancelled or failed — no alert needed
    } finally {
      setExporting(false);
    }
  }, [token]);
```

Add the Export button at the bottom of the `SectionList`, using the `ListFooterComponent` prop:

```typescript
      ListFooterComponent={
        <TouchableOpacity
          style={[exportStyles.button, exporting && exportStyles.buttonDisabled]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting
            ? <ActivityIndicator size="small" color="#c4805a" />
            : <Text style={exportStyles.buttonText}>Export Report</Text>}
        </TouchableOpacity>
      }
```

Add `exportStyles` to the file (outside the main `StyleSheet.create` call, as a separate constant):

```typescript
const exportStyles = StyleSheet.create({
  button: {
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 32,
    backgroundColor: '#252219',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2e2b20',
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#9a9080', fontSize: 14, fontWeight: '500' },
});
```

- [ ] **Step 3: Commit**

```bash
cd apps/mobile
git add lib/api.ts app/(tabs)/history.tsx
git commit -m "feat(mobile): add Export Report button with native share sheet"
```

---

## Self-Review

**Spec coverage:**
- ✅ `GET /exercises/report` endpoint returns generatedAt, summary, domains, recentSessions (Task 1)
- ✅ Summary: totalCompleted, avgScore, streakDays, firstSessionAt (Task 1)
- ✅ Domain breakdown: sessionCount, avgScore, trend direction (improving/declining/stable) (Task 1)
- ✅ Trend computed from first vs second half of session history (Task 1)
- ✅ 10 most recent sessions listed (Task 1)
- ✅ Export button in History screen (Task 2)
- ✅ Plain-text report with columns, summary, domain table, session list, disclaimer (Task 2)
- ✅ Uses `Share.share()` — no new dependency (Task 2)
- ✅ Button shows spinner while fetching, disabled during export (Task 2)
- ✅ Empty state (no sessions) handled gracefully in both backend and frontend (Tasks 1 & 2)

**Placeholder scan:** No TBDs. Domain labels and trend arrows are fully mapped inline in `handleExport`. The disclaimer text is complete.

**Type consistency:** `generateReport` return type `CognitiveReport` matches the `request<...>` generic in `api.ts` field-for-field. `DomainReport.trend` is a string union on the backend; `api.ts` types it as `string` to avoid import complexity — acceptable since it's only displayed.
