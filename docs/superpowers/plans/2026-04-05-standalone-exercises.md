# Standalone (Non-Conversational) Exercises Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Solo" training mode where users complete structured cognitive exercises independently — no chat with Pierre. The user sees an exercise prompt, types their response, and receives an AI-scored result.

**Architecture:** Add a `standalonePrompt` field to every exercise definition. The exercise-service gains a Claude Haiku scorer that evaluates free-text responses against the existing `scoringRubric`. A new `POST /exercises/:id/score-standalone` route returns an `ExerciseResult`. The mobile app gets a new "Solo" tab with a three-phase UX: loading → exercising → result.

**Tech Stack:** `@anthropic-ai/sdk` (exercise-service), Expo/React Native (mobile), mocha/chai/sinon (backend tests), Jest/RNTL (mobile tests)

---

## File Map

- Modify: `packages/types/src/exercise.ts` — add `standalonePrompt: string` to `ExerciseDefinition`
- Modify: `services/exercise-service/src/data/exercises.ts` — add `standalonePrompt` to all 18 exercises
- Create: `services/exercise-service/src/services/claude.service.ts` — `ClaudeScorer` interface + `createClaudeScorer()`
- Modify: `services/exercise-service/src/services/exercise.service.ts` — add `scorer` to deps, add `scoreStandalone` function
- Modify: `services/exercise-service/src/routes/exercises.ts` — add `POST /:id/score-standalone` route
- Modify: `services/exercise-service/src/index.ts` — adopt `AppDeps` pattern, wire scorer
- Modify: `services/exercise-service/package.json` — add `@anthropic-ai/sdk`
- Modify: `apps/mobile/lib/api.ts` — add `exercises.scoreStandalone`
- Create: `apps/mobile/app/(tabs)/solo.tsx` — standalone exercise screen
- Modify: `apps/mobile/app/(tabs)/_layout.tsx` — add "Solo" tab
- Modify: `services/exercise-service/src/__tests__/exercises.test.ts` — update `createApp` calls + add 6 score-standalone tests
- Create: `apps/mobile/__tests__/screens/solo.test.tsx` — mobile screen unit tests

---

### Task 1: Add standalonePrompt to ExerciseDefinition type

**Files:**
- Modify: `packages/types/src/exercise.ts`

- [ ] **Step 1: Write the failing test**

There are no dedicated type tests; this change will cause compile errors in downstream files until the data is added. Verify the current build passes first:

```bash
cd packages/types && npx tsc --noEmit
```

Expected: passes (baseline).

- [ ] **Step 2: Add standalonePrompt to the interface**

In `packages/types/src/exercise.ts`, add `standalonePrompt: string` to `ExerciseDefinition`:

```typescript
export interface ExerciseDefinition {
  id: string;
  type: ExerciseType;
  domain: CognitiveDomain;
  name: string;
  description: string;
  difficulty: number;
  durationSeconds: number;
  parameters: Record<string, unknown>;
  scoringRubric: string;
  conversationalBridges: string[];
  systemPromptFragment: string;
  standalonePrompt: string;
}
```

- [ ] **Step 3: Verify downstream compile errors**

```bash
cd packages/types && npx tsc --noEmit
```

Expected: passes (types package itself has no implementations).

```bash
cd services/exercise-service && npx tsc --noEmit 2>&1 | head -20
```

Expected: errors about missing `standalonePrompt` on each exercise object — that's the correct signal; we fix this in Task 2.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/exercise.ts
git commit -m "feat(types): add standalonePrompt to ExerciseDefinition"
```

---

### Task 2: Add standalonePrompt to all 18 exercises

**Files:**
- Modify: `services/exercise-service/src/data/exercises.ts`

Add a `standalonePrompt` field to each exercise object. The prompts below are the complete, user-facing instructions — everything the user needs to complete the exercise independently.

- [ ] **Step 1: Add standalonePrompt to all 18 exercises**

For each exercise object in `services/exercise-service/src/data/exercises.ts`, add the `standalonePrompt` property as shown below. Add it immediately after `systemPromptFragment` in each object.

**Memory exercises:**

`mem-word-recall`:
```typescript
    standalonePrompt: `Here are 8 words to memorize:\n\napple · bridge · lantern · cloud · violin · marble · forest · kettle\n\nTake 30 seconds to study them. When you're ready, type as many as you can recall (order doesn't matter).`,
```

`mem-story-retelling`:
```typescript
    standalonePrompt: `Read this short story carefully:\n\n"Maria was walking home on Tuesday when she found a blue wallet near the fountain in the park. Inside were three things: a library card, a photo of a dog named Biscuit, and twenty dollars. She brought it to the police station on Oak Street, where Officer Patel took her report."\n\nWhen you're ready, retell the story in your own words, including as many details as you can remember.`,
```

`mem-n-back`:
```typescript
    standalonePrompt: `1-Back task: for each letter after the first, type 'yes' if it matches the letter immediately before it, or 'no' if it doesn't.\n\nSequence:  K  T  K  M  M  P  P  R  T  T  K  K\n\nProvide 11 responses (for positions 2–12), separated by commas.\nExample format:  no, yes, no, yes, yes, yes, no, no, yes, yes, yes`,
```

**Attention exercises:**

`att-digit-span`:
```typescript
    standalonePrompt: `Read each digit sequence, then type it back in the same order. Work through all five.\n\nSequence 1:  7  3  9  1\nSequence 2:  4  8  2  6  3\nSequence 3:  9  1  7  4  2  5\nSequence 4:  3  8  6  1  9  4  7\nSequence 5:  5  2  8  4  7  1  3  9\n\nType each sequence on a separate line.`,
```

`att-stroop`:
```typescript
    standalonePrompt: `Stroop challenge: type the INK COLOR of each item — not the word.\n\n 1. RED    — ink: BLUE\n 2. BLUE   — ink: GREEN\n 3. GREEN  — ink: RED\n 4. YELLOW — ink: PURPLE\n 5. PURPLE — ink: YELLOW\n 6. RED    — ink: GREEN\n 7. BLUE   — ink: RED\n 8. GREEN  — ink: YELLOW\n 9. YELLOW — ink: BLUE\n10. PURPLE — ink: GREEN\n\nType 10 ink colors in order, separated by commas.`,
```

`att-odd-one-out`:
```typescript
    standalonePrompt: `Find the odd one out in each group. Type the word that doesn't belong.\n\n1. piano, guitar, drum, paintbrush\n2. eagle, robin, salmon, sparrow\n3. Paris, Berlin, Tokyo, Amazon\n4. oxygen, nitrogen, gold, helium\n5. rose, tulip, oak, sunflower\n6. January, April, Tuesday, July\n7. tennis, chess, soccer, basketball\n8. hammer, saw, wrench, carrot\n\nType 8 answers, one per line.`,
```

**Processing speed exercises:**

`ps-rapid-categorization`:
```typescript
    standalonePrompt: `For each word, type 'animal' or 'object' as quickly as you can.\n\n1. hammer   2. dolphin   3. scissors   4. eagle   5. chair   6. tiger\n7. lamp     8. frog      9. clock     10. wolf   11. bottle 12. parrot\n\nType 12 answers separated by commas.`,
```

`ps-number-sequence`:
```typescript
    standalonePrompt: `Count the EVEN numbers in this sequence:\n\n3, 8, 1, 4, 7, 2, 9, 6, 5, 8, 3, 4, 11, 6, 7, 2, 9, 4, 1, 8\n\nType your count as a single number.`,
```

`ps-letter-search`:
```typescript
    standalonePrompt: `Count how many times the letter S appears in this sequence:\n\nB  S  T  S  M  K  S  L  S  P  R  S  N  S  Q\n\nType your count as a single number.`,
```

**Executive function exercises:**

`ef-category-switching`:
```typescript
    standalonePrompt: `Alternate naming a fruit and a country, starting with a fruit. No repeats. Continue for 10 turns (5 fruits, 5 countries).\n\nType your sequence separated by commas.\nExample: apple, France, mango, Brazil, ...`,
```

`ef-tower-verbal`:
```typescript
    standalonePrompt: `Tower of Hanoi (3 disks, 3 pegs):\n\n- Pegs: A (start), B (middle), C (goal)\n- Disks: Large (3), Medium (2), Small (1) — all stacked on peg A, largest at bottom\n- Rules: Move one disk at a time. Never place a larger disk on a smaller one.\n- Goal: Move all disks from A to C.\n\nDescribe your moves as "Move disk [size] from [peg] to [peg]", one per line.\nOptimal solution uses 7 moves.`,
```

`ef-verbal-inhibition`:
```typescript
    standalonePrompt: `Type the OPPOSITE of each word:\n\n1. hot    2. fast   3. dark   4. heavy   5. loud\n6. happy  7. tall   8. rough  9. open   10. early\n\nType 10 answers, one per line or comma-separated.`,
```

**Language exercises:**

`lang-category-fluency`:
```typescript
    standalonePrompt: `Name as many different ANIMALS as you can think of.\n\nType them all separated by commas. No repeats. Aim for at least 12.`,
```

`lang-letter-fluency`:
```typescript
    standalonePrompt: `Name as many words as you can that START WITH THE LETTER F.\n\nRules: no proper nouns (no names or places), no numbers. Type them all separated by commas. Aim for at least 10.`,
```

`lang-sentence-completion`:
```typescript
    standalonePrompt: `Complete each sentence starter naturally and grammatically.\n\n1. Every morning she woke up and ___\n2. The doctor told him that ___\n3. Before leaving the house, he always ___\n4. The most important thing in life is ___\n5. Despite the rain, they decided to ___\n6. She couldn't remember where she had put ___\n7. The old map showed a path that led to ___\n8. After many years, they finally ___\n\nWrite one completion per sentence (one per line).`,
```

**Visuospatial exercises:**

`vs-mental-rotation-verbal`:
```typescript
    standalonePrompt: `Describe where each shape points after the transformation:\n\n1. An L-shape pointing RIGHT is rotated 90° clockwise — where does it point?\n2. A T-shape facing UP is flipped upside down — where does it face?\n3. An arrow pointing LEFT is rotated 180° — which direction does it point?\n4. The letter P is mirrored horizontally — what letter does it resemble?\n5. A triangle with its tip pointing UP is rotated 90° clockwise — which direction does the tip point?\n\nType your 5 answers, one per line.`,
```

`vs-direction-following`:
```typescript
    standalonePrompt: `Start at position (0, 0) — the center of a grid. Follow these six moves:\n\n1. Move North 3 steps\n2. Move East 2 steps\n3. Move South 1 step\n4. Move West 4 steps\n5. Move North 2 steps\n6. Move East 3 steps\n\nWhere are you now? Describe your final position relative to the center (e.g., "2 east, 1 north").`,
```

`vs-pattern-description`:
```typescript
    standalonePrompt: `Memorize this 3×3 grid pattern (■ = filled, □ = empty):\n\n■ □ ■\n□ ■ □\n■ □ ■\n\nFilled squares: top-left, top-right, center, bottom-left, bottom-right.\n\nNow, without looking back — type the positions of the 5 filled squares.`,
```

- [ ] **Step 2: Verify the exercise-service compiles**

```bash
cd services/exercise-service && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run existing tests to confirm nothing broke**

```bash
cd services/exercise-service && pnpm test
```

Expected: all existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add services/exercise-service/src/data/exercises.ts packages/types/src/exercise.ts
git commit -m "feat(exercises): add standalonePrompt to all 18 exercise definitions"
```

---

### Task 3: Add Claude scorer to exercise-service

**Files:**
- Create: `services/exercise-service/src/services/claude.service.ts`
- Modify: `services/exercise-service/package.json`

- [ ] **Step 1: Add @anthropic-ai/sdk dependency**

In `services/exercise-service/package.json`, add to `"dependencies"`:

```json
"@anthropic-ai/sdk": "^0.20.0",
```

Then install:

```bash
cd services/exercise-service && pnpm install
```

- [ ] **Step 2: Write the failing test for the scorer interface**

This task's correctness will be validated indirectly via the route tests in Task 6. No separate unit test is needed for the claude.service module since it calls the real Anthropic API and is designed to be mocked at the service boundary in tests.

- [ ] **Step 3: Create claude.service.ts**

Create `services/exercise-service/src/services/claude.service.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

export interface ScoringResult {
  rawScore: number;
  normalizedScore: number;
  feedback: string;
}

export interface ClaudeScorer {
  score: (rubric: string, userResponse: string) => Promise<ScoringResult>;
}

export function createClaudeScorer(apiKey?: string): ClaudeScorer {
  const client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY });

  return {
    async score(rubric, userResponse) {
      const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: `Score this cognitive exercise response.\n\nSCORING RUBRIC:\n${rubric}\n\nUSER RESPONSE:\n${userResponse}\n\nOutput ONLY this JSON on its own line:\nEXERCISE_SCORE: {"rawScore": <number>, "normalizedScore": <number>, "feedback": "<1 encouraging sentence>"}`,
        }],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '';
      const match = text.match(/EXERCISE_SCORE:\s*(\{[\s\S]*?\})/);
      if (!match) throw new Error('Claude did not return a valid score');

      const parsed = JSON.parse(match[1]) as ScoringResult;
      return {
        rawScore: parsed.rawScore,
        normalizedScore: parsed.normalizedScore,
        feedback: parsed.feedback,
      };
    },
  };
}
```

- [ ] **Step 4: Verify it compiles**

```bash
cd services/exercise-service && npx tsc --noEmit
```

Expected: no errors (assuming @anthropic-ai/sdk types are installed).

- [ ] **Step 5: Commit**

```bash
git add services/exercise-service/src/services/claude.service.ts services/exercise-service/package.json pnpm-lock.yaml
git commit -m "feat(exercise-service): add ClaudeScorer service for standalone exercise scoring"
```

---

### Task 4: Add scoreStandalone to exercise.service + route

**Files:**
- Modify: `services/exercise-service/src/services/exercise.service.ts`
- Modify: `services/exercise-service/src/routes/exercises.ts`
- Modify: `services/exercise-service/src/index.ts`

- [ ] **Step 1: Extend ExerciseServiceDeps and add scoreStandalone**

In `services/exercise-service/src/services/exercise.service.ts`:

1. Add the import at the top:
```typescript
import type { ClaudeScorer } from './claude.service';
```

2. Update `ExerciseServiceDeps`:
```typescript
export interface ExerciseServiceDeps {
  db: DB;
  scorer: ClaudeScorer;
}
```

3. Destructure `scorer` from deps in `createExerciseService`:
```typescript
export function createExerciseService(deps: ExerciseServiceDeps) {
  const { db, scorer } = deps;
  // ... existing code unchanged ...
```

4. Add `scoreStandalone` after the existing `submitExercise` function, before the `return` statement:

```typescript
  async function scoreStandalone(
    sessionId: string,
    requestingUserId: string,
    userResponse: string,
    durationSeconds: number,
  ): Promise<ExerciseResult> {
    const session = await db.query.exerciseSessions.findFirst({
      where: eq(exerciseSessions.id, sessionId),
    });

    if (!session) throw Object.assign(new Error('Exercise session not found'), { code: 'NOT_FOUND' });
    if (session.userId !== requestingUserId) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
    if (session.completedAt) throw Object.assign(new Error('Already submitted'), { code: 'ALREADY_SUBMITTED' });

    const exercise = getExerciseById(session.exerciseId);
    if (!exercise) throw Object.assign(new Error('Exercise definition not found'), { code: 'NOT_FOUND' });

    const scored = await scorer.score(exercise.scoringRubric, userResponse);

    await db.update(exerciseSessions)
      .set({
        rawScore: scored.rawScore,
        normalizedScore: scored.normalizedScore,
        userResponse,
        durationSeconds,
        completedAt: new Date(),
        metadata: { feedback: scored.feedback },
      })
      .where(eq(exerciseSessions.id, sessionId));

    return {
      exerciseSessionId: sessionId,
      rawScore: scored.rawScore,
      normalizedScore: scored.normalizedScore,
      domain: session.domain as CognitiveDomain,
      feedback: scored.feedback,
    };
  }
```

5. Add `scoreStandalone` to the return object:
```typescript
  return { getNextExercise, submitExercise, getHistory, scoreStandalone };
```

- [ ] **Step 2: Add POST /:id/score-standalone route**

In `services/exercise-service/src/routes/exercises.ts`, add after the `GET /history` route (before `return router`):

```typescript
  const scoreStandaloneSchema = z.object({
    userResponse: z.string().min(1).max(8000),
    durationSeconds: z.number().positive(),
  });

  router.post('/:id/score-standalone', async (req, res: Response) => {
    const { userId } = req as unknown as AuthRequest;
    const parsed = scoreStandaloneSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    try {
      const result = await exerciseService.scoreStandalone(
        req.params.id,
        userId,
        parsed.data.userResponse,
        parsed.data.durationSeconds,
      );
      return res.json(result);
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Exercise session not found' });
      if (err.code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
      if (err.code === 'ALREADY_SUBMITTED') return res.status(409).json({ error: 'Exercise already submitted' });
      console.error('Score standalone error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
```

- [ ] **Step 3: Update index.ts to wire in scorer**

Replace the contents of `services/exercise-service/src/index.ts` with:

```typescript
import 'dotenv/config';
import express from 'express';
import { db as defaultDb } from './db/index';
import type { DB } from './db/index';
import { createClaudeScorer } from './services/claude.service';
import type { ClaudeScorer } from './services/claude.service';
import { createExercisesRouter } from './routes/exercises';

export interface AppDeps {
  db?: DB;
  scorer?: ClaudeScorer;
}

export function createApp(deps: AppDeps = {}) {
  const db = deps.db ?? defaultDb;
  const scorer = deps.scorer ?? createClaudeScorer();

  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'exercise-service' });
  });

  app.use('/exercises', createExercisesRouter({ db, scorer }));

  return app;
}

if (require.main === module) {
  const port = process.env.EXERCISE_SERVICE_PORT ?? 3003;
  createApp().listen(port, () => console.log(`exercise-service listening on port ${port}`));
}
```

- [ ] **Step 4: Verify compile**

```bash
cd services/exercise-service && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add services/exercise-service/src/services/exercise.service.ts \
        services/exercise-service/src/routes/exercises.ts \
        services/exercise-service/src/index.ts
git commit -m "feat(exercise-service): add scoreStandalone endpoint for non-conversational exercise scoring"
```

---

### Task 5: Update existing exercise tests + add score-standalone tests

**Files:**
- Modify: `services/exercise-service/src/__tests__/exercises.test.ts`

The `createApp` signature changed from `createApp(db)` to `createApp({ db, scorer })`. All existing test calls must be updated.

- [ ] **Step 1: Write new tests + update existing calls**

At the top of `services/exercise-service/src/__tests__/exercises.test.ts`, add a scorer mock factory after `makeDb`:

```typescript
function makeMockScorer() {
  return {
    score: sinon.stub().resolves({ rawScore: 4, normalizedScore: 50, feedback: 'Good effort!' }),
  };
}
```

Update every `createApp(db)` call in the file to `createApp({ db })`:

```typescript
// Before:
const res = await request(createApp(db)).get('/health');
// After:
const res = await request(createApp({ db })).get('/health');
```

There are 8 occurrences across the describe blocks for health, GET /exercises/next, POST /exercises/:id/submit, and GET /exercises/history. Replace all of them.

Then add the following describe block at the end of the file:

```typescript
// ─── POST /exercises/:id/score-standalone ────────────────────────────────────

describe('POST /exercises/:id/score-standalone', () => {
  afterEach(() => sinon.restore());

  const validBody = {
    userResponse: 'apple, bridge, lantern',
    durationSeconds: 45,
  };

  it('scores a standalone exercise and returns ExerciseResult', async () => {
    const { db } = makeDb();
    db.query.exerciseSessions.findFirst.resolves(makeSession());
    const scorer = makeMockScorer();
    const token = await makeToken();
    const res = await request(createApp({ db, scorer }))
      .post('/exercises/session-1/score-standalone')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);

    expect(res.status).to.equal(200);
    expect(res.body.exerciseSessionId).to.equal('session-1');
    expect(res.body.rawScore).to.equal(4);
    expect(res.body.normalizedScore).to.equal(50);
    expect(res.body.domain).to.equal('memory');
    expect(res.body.feedback).to.equal('Good effort!');
    expect(scorer.score.calledOnce).to.be.true;
  });

  it('returns 404 for unknown session', async () => {
    const { db } = makeDb();
    db.query.exerciseSessions.findFirst.resolves(null);
    const scorer = makeMockScorer();
    const token = await makeToken();
    const res = await request(createApp({ db, scorer }))
      .post('/exercises/bad-session/score-standalone')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).to.equal(404);
  });

  it('returns 403 for another user\'s session', async () => {
    const { db } = makeDb();
    db.query.exerciseSessions.findFirst.resolves(makeSession({ userId: 'other-user' }));
    const scorer = makeMockScorer();
    const token = await makeToken('user-123');
    const res = await request(createApp({ db, scorer }))
      .post('/exercises/session-1/score-standalone')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).to.equal(403);
  });

  it('returns 409 when session already submitted', async () => {
    const { db } = makeDb();
    db.query.exerciseSessions.findFirst.resolves(makeSession({ completedAt: new Date() }));
    const scorer = makeMockScorer();
    const token = await makeToken();
    const res = await request(createApp({ db, scorer }))
      .post('/exercises/session-1/score-standalone')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).to.equal(409);
  });

  it('returns 400 for invalid request body', async () => {
    const { db } = makeDb();
    const scorer = makeMockScorer();
    const token = await makeToken();
    const res = await request(createApp({ db, scorer }))
      .post('/exercises/session-1/score-standalone')
      .set('Authorization', `Bearer ${token}`)
      .send({ userResponse: '' }); // empty userResponse and no durationSeconds
    expect(res.status).to.equal(400);
  });

  it('returns 401 without token', async () => {
    const { db } = makeDb();
    const scorer = makeMockScorer();
    const res = await request(createApp({ db, scorer }))
      .post('/exercises/session-1/score-standalone')
      .send(validBody);
    expect(res.status).to.equal(401);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd services/exercise-service && pnpm test 2>&1 | tail -20
```

Expected: compile passes; 6 new tests fail (route doesn't exist yet — but wait, we added the route in Task 4, so they should pass. If Task 4 was done first, these should pass immediately. Run to confirm.)

- [ ] **Step 3: Run full suite to verify all tests pass**

```bash
cd services/exercise-service && pnpm test
```

Expected: all existing tests + 6 new tests pass. Total increase of 6 tests.

- [ ] **Step 4: Commit**

```bash
git add services/exercise-service/src/__tests__/exercises.test.ts
git commit -m "test(exercise-service): update createApp calls + add score-standalone integration tests"
```

---

### Task 6: Add scoreStandalone to mobile api.ts

**Files:**
- Modify: `apps/mobile/lib/api.ts`

- [ ] **Step 1: Write the failing test**

There's no dedicated api.ts test file (api is tested indirectly through screen tests). The test for this is the solo screen test in Task 8.

- [ ] **Step 2: Add scoreStandalone to api.ts**

In `apps/mobile/lib/api.ts`, inside the `exercises` object (after `history`), add:

```typescript
    scoreStandalone: (
      sessionId: string,
      token: string,
      body: { userResponse: string; durationSeconds: number },
    ) =>
      request<{ exerciseSessionId: string; rawScore: number; normalizedScore: number; domain: string; feedback: string }>(
        `${API.exercise}/exercises/${sessionId}/score-standalone`,
        { method: 'POST', token, body: JSON.stringify(body) },
      ),
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -10
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/lib/api.ts
git commit -m "feat(mobile): add exercises.scoreStandalone API call"
```

---

### Task 7: Build the Solo screen

**Files:**
- Create: `apps/mobile/app/(tabs)/solo.tsx`

The screen has three phases:
- `loading`: fetches next exercise (`GET /exercises/next`), shows spinner
- `ready`: shows `exercise.standalonePrompt`, TextInput, Submit button, and elapsed timer
- `result`: shows score ring (percentage circle), feedback text, and "Next Exercise" button

The timer starts when the exercise loads and stops when the user submits.

- [ ] **Step 1: Write the failing test** (see Task 8 — write tests first, then implement)

Skip to Task 8 first, then come back to implement.

- [ ] **Step 2: Create solo.tsx**

Create `apps/mobile/app/(tabs)/solo.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from 'expo-router';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';

type Phase = 'loading' | 'ready' | 'submitting' | 'result';

interface Exercise {
  id: string;
  domain: string;
  name: string;
  standalonePrompt: string;
}

interface Result {
  rawScore: number;
  normalizedScore: number;
  domain: string;
  feedback: string;
}

export default function SoloScreen() {
  const navigation = useNavigation();
  const { token } = useAuthStore();

  const [phase, setPhase] = useState<Phase>('loading');
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userResponse, setUserResponse] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const loadExercise = useCallback(async () => {
    if (!token) return;
    setPhase('loading');
    setUserResponse('');
    setResult(null);
    setElapsed(0);
    try {
      const data = await api.exercises.next(token);
      setExercise({
        id: data.exercise.id,
        domain: data.exercise.domain,
        name: data.exercise.name,
        standalonePrompt: (data.exercise as any).standalonePrompt ?? data.exercise.systemPromptFragment,
      });
      setSessionId(data.sessionId);
      startedAtRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 1000);
      setPhase('ready');
    } catch {
      Alert.alert('Error', 'Could not load exercise. Please try again.');
      setPhase('loading');
    }
  }, [token]);

  useEffect(() => {
    loadExercise();
    return stopTimer;
  }, [loadExercise, stopTimer]);

  useEffect(() => {
    navigation.setOptions({ title: 'Solo Training' });
  }, [navigation]);

  const handleSubmit = useCallback(async () => {
    if (!token || !sessionId || !userResponse.trim()) return;
    stopTimer();
    const durationSeconds = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
    setPhase('submitting');
    try {
      const data = await api.exercises.scoreStandalone(sessionId, token, {
        userResponse: userResponse.trim(),
        durationSeconds,
      });
      setResult(data);
      setPhase('result');
    } catch {
      Alert.alert('Error', 'Could not submit response. Please try again.');
      setPhase('ready');
    }
  }, [token, sessionId, userResponse, stopTimer]);

  if (phase === 'loading') {
    return (
      <View style={styles.center} testID="solo-loading">
        <ActivityIndicator size="large" color="#6c63ff" />
        <Text style={styles.loadingText}>Loading exercise…</Text>
      </View>
    );
  }

  if (phase === 'result' && result) {
    const pct = Math.round(result.normalizedScore);
    return (
      <ScrollView contentContainerStyle={styles.resultContainer} testID="solo-result">
        <Text style={styles.scoreLabel}>Score</Text>
        <Text style={styles.scoreValue} testID="score-value">{pct}%</Text>
        <Text style={styles.domainBadge}>{result.domain.replace('_', ' ')}</Text>
        <Text style={styles.feedback} testID="score-feedback">{result.feedback}</Text>
        <TouchableOpacity style={styles.nextButton} onPress={loadExercise} testID="next-exercise-btn">
          <Text style={styles.nextButtonText}>Next Exercise</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.exerciseContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.exerciseName} testID="exercise-name">{exercise?.name}</Text>
        <Text style={styles.timer} testID="elapsed-timer">{elapsed}s</Text>
      </View>
      <Text style={styles.prompt} testID="exercise-prompt">{exercise?.standalonePrompt}</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="Type your response here…"
        placeholderTextColor="#555"
        value={userResponse}
        onChangeText={setUserResponse}
        testID="response-input"
      />
      <TouchableOpacity
        style={[styles.submitButton, !userResponse.trim() && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={phase === 'submitting' || !userResponse.trim()}
        testID="submit-btn"
      >
        {phase === 'submitting'
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitButtonText}>Submit</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d1a',
  },
  loadingText: {
    color: '#aaa',
    marginTop: 12,
    fontSize: 14,
  },
  exerciseContainer: {
    padding: 20,
    backgroundColor: '#0d0d1a',
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  timer: {
    color: '#6c63ff',
    fontSize: 14,
    marginLeft: 8,
  },
  prompt: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    color: '#fff',
    fontSize: 15,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#6c63ff',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#3a3a5a',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    padding: 20,
    backgroundColor: '#0d0d1a',
    flexGrow: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 4,
    marginTop: 40,
  },
  scoreValue: {
    color: '#6c63ff',
    fontSize: 64,
    fontWeight: '700',
  },
  domainBadge: {
    color: '#8e8e93',
    fontSize: 13,
    textTransform: 'capitalize',
    marginBottom: 24,
  },
  feedback: {
    color: '#ddd',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  nextButton: {
    backgroundColor: '#6c63ff',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

- [ ] **Step 3: Verify it compiles**

```bash
cd apps/mobile && npx tsc --noEmit 2>&1 | head -10
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(tabs\)/solo.tsx
git commit -m "feat(mobile): add Solo standalone exercise screen"
```

---

### Task 8: Add Solo tab to navigation

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Write the failing test**

The navigation layout is tested indirectly through the auth guard tests and manual navigation. No isolated test is needed here.

- [ ] **Step 2: Add the Solo tab**

In `apps/mobile/app/(tabs)/_layout.tsx`, add a `Tabs.Screen` for `solo` between the `Train` tab and the `History` tab:

```tsx
      <Tabs.Screen
        name="solo"
        options={{
          title: 'Solo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size} color={color} />
          ),
        }}
      />
```

The full updated file:

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6c63ff',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
          backgroundColor: '#0d0d1a',
          borderTopColor: '#2a2a4a',
        },
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Train',
          headerTitle: 'Preventia',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="solo"
        options={{
          title: 'Solo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/_layout.tsx
git commit -m "feat(mobile): add Solo tab to navigation"
```

---

### Task 9: Write solo screen tests

**Files:**
- Create: `apps/mobile/__tests__/screens/solo.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `apps/mobile/__tests__/screens/solo.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import SoloScreen from '@/app/(tabs)/solo';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNextExercise = jest.fn();
const mockScoreStandalone = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    exercises: {
      next: (...args: any[]) => mockNextExercise(...args),
      scoreStandalone: (...args: any[]) => mockScoreStandalone(...args),
    },
  },
}));

const mockAuthState = {
  token: 'test-token',
  user: { id: 'u1', email: 'a@b.com', name: 'Test', onboardingComplete: true },
};

jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn((selector?: any) =>
    selector ? selector(mockAuthState) : mockAuthState,
  ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockExercise = {
  exercise: {
    id: 'mem-word-recall',
    domain: 'memory',
    name: 'Word List Recall',
    type: 'word_list_recall',
    systemPromptFragment: 'EXERCISE ACTIVE',
    standalonePrompt: 'Here are 8 words to memorize: apple, bridge, lantern...',
  },
  sessionId: 'session-abc',
};

const mockResult = {
  exerciseSessionId: 'session-abc',
  rawScore: 5,
  normalizedScore: 62.5,
  domain: 'memory',
  feedback: 'Great recall!',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SoloScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockNextExercise.mockResolvedValue(mockExercise);
    mockScoreStandalone.mockResolvedValue(mockResult);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows loading spinner on mount', () => {
    render(<SoloScreen />);
    expect(screen.getByTestId('solo-loading')).toBeTruthy();
  });

  it('shows exercise prompt after loading', async () => {
    render(<SoloScreen />);
    await waitFor(() => expect(screen.getByTestId('exercise-prompt')).toBeTruthy());
    expect(screen.getByText('Word List Recall')).toBeTruthy();
    expect(screen.getByText('Here are 8 words to memorize: apple, bridge, lantern...')).toBeTruthy();
  });

  it('shows a timer that counts elapsed seconds', async () => {
    render(<SoloScreen />);
    await waitFor(() => expect(screen.getByTestId('elapsed-timer')).toBeTruthy());
    expect(screen.getByTestId('elapsed-timer').props.children).toBe('0s');

    act(() => { jest.advanceTimersByTime(3000); });
    expect(screen.getByTestId('elapsed-timer').props.children).toBe('3s');
  });

  it('submit button is disabled when response is empty', async () => {
    render(<SoloScreen />);
    await waitFor(() => expect(screen.getByTestId('submit-btn')).toBeTruthy());
    const btn = screen.getByTestId('submit-btn');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBe(true);
  });

  it('submit button is enabled when user types a response', async () => {
    render(<SoloScreen />);
    await waitFor(() => expect(screen.getByTestId('response-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('response-input'), 'apple, bridge, lantern');
    const btn = screen.getByTestId('submit-btn');
    expect(btn.props.accessibilityState?.disabled ?? btn.props.disabled).toBeFalsy();
  });

  it('shows result screen after submitting', async () => {
    render(<SoloScreen />);
    await waitFor(() => expect(screen.getByTestId('response-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('response-input'), 'apple, bridge, lantern');
    await act(async () => { fireEvent.press(screen.getByTestId('submit-btn')); });
    await waitFor(() => expect(screen.getByTestId('solo-result')).toBeTruthy());
    expect(screen.getByTestId('score-value').props.children).toBe(63); // Math.round(62.5)
    expect(screen.getByTestId('score-feedback').props.children).toBe('Great recall!');
  });

  it('calls scoreStandalone with trimmed response and durationSeconds', async () => {
    render(<SoloScreen />);
    await waitFor(() => expect(screen.getByTestId('response-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('response-input'), '  apple, bridge  ');

    act(() => { jest.advanceTimersByTime(10000); }); // 10 seconds elapsed

    await act(async () => { fireEvent.press(screen.getByTestId('submit-btn')); });
    await waitFor(() => expect(mockScoreStandalone).toHaveBeenCalled());

    const [sessionId, token, body] = mockScoreStandalone.mock.calls[0];
    expect(sessionId).toBe('session-abc');
    expect(token).toBe('test-token');
    expect(body.userResponse).toBe('apple, bridge');
    expect(body.durationSeconds).toBeGreaterThanOrEqual(10);
  });

  it('loads a new exercise when Next Exercise is pressed', async () => {
    render(<SoloScreen />);
    await waitFor(() => expect(screen.getByTestId('response-input')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('response-input'), 'apple');
    await act(async () => { fireEvent.press(screen.getByTestId('submit-btn')); });
    await waitFor(() => expect(screen.getByTestId('next-exercise-btn')).toBeTruthy());

    mockNextExercise.mockResolvedValueOnce({
      ...mockExercise,
      exercise: { ...mockExercise.exercise, name: 'Story Retelling' },
      sessionId: 'session-xyz',
    });

    await act(async () => { fireEvent.press(screen.getByTestId('next-exercise-btn')); });
    await waitFor(() => expect(mockNextExercise).toHaveBeenCalledTimes(2));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/mobile && pnpm test -- --testPathPattern="solo" 2>&1 | tail -30
```

Expected: tests fail because `solo.tsx` is not yet imported (or render fails if the screen has missing dependencies).

- [ ] **Step 3: Run tests after implementing the screen (Task 7)**

```bash
cd apps/mobile && pnpm test -- --testPathPattern="solo"
```

Expected: all 8 tests pass.

- [ ] **Step 4: Run full mobile test suite to check for regressions**

```bash
cd apps/mobile && pnpm test
```

Expected: all existing tests still pass + 8 new solo tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/__tests__/screens/solo.test.tsx
git commit -m "test(mobile): add SoloScreen unit tests"
```

---

## Self-Review

**Spec coverage:**
- ✅ `standalonePrompt` type field added (Task 1)
- ✅ All 18 exercises have `standalonePrompt` (Task 2)
- ✅ Claude scorer (Haiku) calls real API in prod, mock in tests (Task 3)
- ✅ `scoreStandalone` service function verifies ownership + not-yet-submitted (Task 4)
- ✅ `POST /exercises/:id/score-standalone` route with zod validation (Task 4)
- ✅ Mobile `api.exercises.scoreStandalone` (Task 6)
- ✅ Solo screen: loading → exercise prompt + timer → result with score % (Task 7)
- ✅ "Solo" tab in tab bar (Task 8)
- ✅ 6 backend integration tests + 8 mobile screen tests (Tasks 5, 9)

**Placeholder scan:** No TBDs. All 18 exercise prompts are fully written. All test bodies are complete.

**Type consistency:**
- `ExerciseDefinition.standalonePrompt` added in Task 1 and populated in Task 2
- `ClaudeScorer` interface defined in Task 3, used in `ExerciseServiceDeps` in Task 4, mocked in Task 5
- `AppDeps` replaces positional `db` arg in index.ts in Task 4; all test calls updated in Task 5
- `api.exercises.scoreStandalone` return type matches `ExerciseResult` shape from backend
- Solo screen `Exercise.standalonePrompt` falls back to `systemPromptFragment` if the field is missing at runtime (defensive cast with `as any`)
