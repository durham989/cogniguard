# Exercise Input Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all-typing solo exercises with three science-backed interactive input types (multiple-choice, word-bank, sequence-recall) that preserve cognitive training efficacy while being accessible and fun for older adults.

**Architecture:** Add an `inputType` discriminant to `ExerciseDefinition` in shared types; add 12 new exercises with typed inputs across all six cognitive domains; add a deterministic `POST /api/exercises/:id/score-typed` route (no Claude needed for these types); and render the appropriate React Native input component in the Solo screen based on `inputType`.

**Tech Stack:** TypeScript, Drizzle ORM (Postgres), Express, React Native, `react-native-safe-area-context`, Zustand, existing `@cogniguard/types` package, Jest/supertest for backend tests.

**Scientific basis:**
- Multiple-choice: recognition memory is a validated proxy for episodic memory (Wechsler Memory Scale); forced-choice paradigms used in MoCA and MMSE.
- Word-bank / cloze: gap-fill tasks target semantic memory and language processing (Cloze Procedure, Taylor 1953; used in language batteries).
- Sequence recall: digit span and word span are gold-standard working memory measures (Baddeley's phonological loop model, used in WAIS-IV, RBANS).

---

## File Map

**Modified:**
- `packages/types/src/exercise.ts` — add `InputType`, typed option fields, `TypedAnswer`, `TypedScoreRequest`
- `services/exercise-service/src/data/exercises.ts` — add `inputType: 'free-text'` to all 24 existing exercises, add 12 new typed exercises
- `services/exercise-service/src/services/exercise.service.ts` — add `scoreTyped()` function
- `services/exercise-service/src/routes/exercises.ts` — add `POST /:id/score-typed` route
- `services/exercise-service/src/__tests__/exercises.test.ts` — tests for new route
- `apps/mobile/lib/api.ts` — add `scoreTyped` method
- `apps/mobile/app/(tabs)/solo.tsx` — render typed input components, call correct endpoint

**Created:**
- `apps/mobile/components/exercises/MultipleChoiceInput.tsx`
- `apps/mobile/components/exercises/WordBankInput.tsx`
- `apps/mobile/components/exercises/SequenceRecallInput.tsx`
- `apps/mobile/components/exercises/FreeTextInput.tsx`

---

## Task 1: Extend Shared Types

**Files:**
- Modify: `packages/types/src/exercise.ts`

- [ ] **Step 1: Add `InputType` and typed option interfaces**

Open `packages/types/src/exercise.ts`. After the existing type definitions, add:

```typescript
export type InputType = 'free-text' | 'multiple-choice' | 'word-bank' | 'sequence-recall';

export interface MultipleChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface WordBankData {
  /** Full sentence with ____ markers for each blank, e.g. "Scientists use a ____ to see tiny ____." */
  sentence: string;
  /** Correct answers in left-to-right blank order */
  answers: string[];
  /** Pool of words including correct answers + distractors */
  bankWords: string[];
}
```

- [ ] **Step 2: Add new optional fields to `ExerciseDefinition`**

In the `ExerciseDefinition` interface, add after the existing `standalonePrompt` field:

```typescript
  /** Defaults to 'free-text' when absent */
  inputType?: InputType;
  /** Present when inputType === 'multiple-choice' */
  options?: MultipleChoiceOption[];
  /** Present when inputType === 'word-bank' */
  wordBankData?: WordBankData;
  /** Present when inputType === 'sequence-recall' — items to memorize in order */
  sequenceItems?: string[];
  /** How long to show the sequence before hiding it (ms). Default 4000 */
  sequenceDisplayMs?: number;
```

- [ ] **Step 3: Add `TypedAnswer` and `TypedScoreRequest` types**

```typescript
export type TypedAnswer =
  | { inputType: 'multiple-choice'; selectedOptionId: string }
  | { inputType: 'word-bank'; filledBlanks: string[] }
  | { inputType: 'sequence-recall'; sequence: string[] };

export interface TypedScoreRequest {
  answer: TypedAnswer;
  durationSeconds: number;
}

export interface TypedScoreResult {
  exerciseSessionId: string;
  rawScore: number;
  normalizedScore: number;
  domain: string;
  feedback: string;
}
```

- [ ] **Step 4: Build the types package and verify no errors**

```bash
cd /path/to/repo && pnpm --filter @cogniguard/types build
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add packages/types/src/exercise.ts
git commit -m "feat(types): add InputType, typed option fields, TypedAnswer to ExerciseDefinition"
```

---

## Task 2: Add Typed Exercise Definitions

**Files:**
- Modify: `services/exercise-service/src/data/exercises.ts`

- [ ] **Step 1: Add `inputType: 'free-text'` to all existing exercises**

At the top of the file, each exercise object in the `EXERCISES` array needs `inputType: 'free-text' as const` added. Do a find-and-replace: add `inputType: 'free-text' as const,` immediately after each `standalonePrompt:` field. There are 24 exercises to update. This makes the existing behavior explicit and preserves backward compatibility.

- [ ] **Step 2: Add the 12 new typed exercises**

Append to the `EXERCISES` array:

```typescript
  // ── MEMORY ─────────────────────────────────────────────────────

  {
    id: 'mem-digit-span',
    type: 'word_list_recall',
    domain: 'memory',
    name: 'Digit Span',
    description: 'Memorize a sequence of digits and recall them in order',
    difficulty: 2,
    durationSeconds: 60,
    parameters: {},
    inputType: 'sequence-recall' as const,
    sequenceItems: ['4', '7', '2', '9', '1', '6'],
    sequenceDisplayMs: 4000,
    scoringRubric: '',
    conversationalBridges: [
      "Let's sharpen your working memory — I'll read you a sequence of numbers.",
      "Time to test your digit span. Ready to memorize some numbers in order?",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Digit Span: Read these digits one per second: 4, 7, 2, 9, 1, 6. Then ask the user to repeat them in exact order. Score 1 point per digit in the correct position out of 6. normalizedScore = (correct/6)*100.",
    standalonePrompt: '',
  },

  {
    id: 'mem-word-sequence',
    type: 'word_list_recall',
    domain: 'memory',
    name: 'Word Order Recall',
    description: 'Study a list of words then tap them back in the order shown',
    difficulty: 3,
    durationSeconds: 90,
    parameters: {},
    inputType: 'sequence-recall' as const,
    sequenceItems: ['Piano', 'Umbrella', 'Mountain', 'Dolphin', 'Candle'],
    sequenceDisplayMs: 5000,
    scoringRubric: '',
    conversationalBridges: [
      "Let's test your verbal working memory with a word sequence challenge.",
      "I'll give you five words to memorize in order — this one tests your working memory.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Word Sequence: Present these words one at a time: Piano, Umbrella, Mountain, Dolphin, Candle. Ask user to repeat in exact order. Score 1 point per word in correct position out of 5. normalizedScore = (correct/5)*100.",
    standalonePrompt: '',
  },

  // ── ATTENTION ───────────────────────────────────────────────────

  {
    id: 'attn-stroop-color',
    type: 'stroop_variant',
    domain: 'attention',
    name: 'Color-Word Challenge',
    description: 'Name the ink color of a word, not what the word says — classic Stroop task',
    difficulty: 2,
    durationSeconds: 30,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'Blue', isCorrect: true },
      { id: 'b', text: 'Green', isCorrect: false },
      { id: 'c', text: 'Red', isCorrect: false },
      { id: 'd', text: 'Yellow', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Here's a classic brain challenge — it tests how well you can ignore a distraction.",
      "Let's try the Stroop task — your brain will want to read the word, but I need the color.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Stroop: Ask 'The word GREEN is displayed in BLUE ink. What color is the ink?' Correct answer is Blue. Score 100 if correct, 0 if not.",
    standalonePrompt: 'The word "GREEN" is displayed in BLUE ink.\n\nWhat color is the ink?',
  },

  {
    id: 'attn-category-intruder',
    type: 'selective_attention',
    domain: 'attention',
    name: 'Find the Intruder',
    description: 'Identify the word that does not belong to the group',
    difficulty: 1,
    durationSeconds: 30,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'Robin', isCorrect: false },
      { id: 'b', text: 'Eagle', isCorrect: false },
      { id: 'c', text: 'Salmon', isCorrect: true },
      { id: 'd', text: 'Hawk', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Let's see how sharp your categorization is — which one of these doesn't belong?",
      "Spot the odd one out — this tests selective attention and semantic reasoning.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Category Intruder: Ask 'Which word does not belong: Robin, Eagle, Salmon, Hawk?' Answer is Salmon (fish; others are birds). Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Which word does NOT belong in this group?\n\nRobin · Eagle · Salmon · Hawk',
  },

  // ── PROCESSING SPEED ────────────────────────────────────────────

  {
    id: 'ps-number-series',
    type: 'digit_symbol_coding',
    domain: 'processing_speed',
    name: 'Number Series',
    description: 'Quickly identify what comes next in a numerical pattern',
    difficulty: 2,
    durationSeconds: 30,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: '36', isCorrect: false },
      { id: 'b', text: '48', isCorrect: true },
      { id: 'c', text: '30', isCorrect: false },
      { id: 'd', text: '42', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Quick brain teaser — what comes next in this number pattern?",
      "Let's test your processing speed with a number series.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Number Series: Ask 'What comes next: 3, 6, 12, 24, ___?' Pattern doubles each time, answer is 48. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'What comes next in this pattern?\n\n3 → 6 → 12 → 24 → ___',
  },

  {
    id: 'ps-rule-breaker',
    type: 'trail_making',
    domain: 'processing_speed',
    name: 'Odd One Out',
    description: 'Quickly find the number that breaks the pattern',
    difficulty: 1,
    durationSeconds: 20,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: '2', isCorrect: false },
      { id: 'b', text: '4', isCorrect: false },
      { id: 'c', text: '7', isCorrect: true },
      { id: 'd', text: '8', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Which number breaks the rule? Go fast — speed matters here.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Odd Number Out: Ask 'Which does not fit: 2, 4, 7, 8, 10?' Answer is 7 (only odd number). Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Which number does NOT fit the pattern?\n\n2 · 4 · 7 · 8 · 10',
  },

  // ── EXECUTIVE FUNCTION ──────────────────────────────────────────

  {
    id: 'ef-word-analogy-mcq',
    type: 'analogical_reasoning',
    domain: 'executive_function',
    name: 'Word Analogy',
    description: 'Complete the relationship between word pairs',
    difficulty: 2,
    durationSeconds: 30,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'School', isCorrect: true },
      { id: 'b', text: 'Student', isCorrect: false },
      { id: 'c', text: 'Chalk', isCorrect: false },
      { id: 'd', text: 'Classroom', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Let's try a word analogy — these test your abstract reasoning.",
      "Analogies are great for the brain. Doctor is to Hospital as Teacher is to…?",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Analogy: Ask 'Doctor is to Hospital as Teacher is to ___?' Answer: School. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Complete the analogy:\n\nDoctor is to Hospital as Teacher is to ___?',
  },

  {
    id: 'ef-planning-mcq',
    type: 'planning',
    domain: 'executive_function',
    name: 'Time Planning',
    description: 'Work out whether a multi-step plan can be completed in time',
    difficulty: 3,
    durationSeconds: 45,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'No — mixing + baking + cooling = 70 minutes', isCorrect: true },
      { id: 'b', text: 'Yes — you have exactly 60 minutes', isCorrect: false },
      { id: 'c', text: 'Yes — the cooling step is optional', isCorrect: false },
      { id: 'd', text: 'No — you forgot to preheat the oven', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Here's a planning puzzle — you'll need to think through the timing carefully.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Planning: Pose the cake problem (mix 10 min + bake 45 min + cool 15 min = 70 min, guests in 60 min). Answer: No — 70 minutes needed. Score 100 correct, 0 incorrect.",
    standalonePrompt:
      "You want to bake a cake that takes 45 minutes in the oven. Your guests arrive in 1 hour. You still need to mix the batter (10 min) and let it cool after baking (15 min).\n\nCan you finish in time?",
  },

  // ── LANGUAGE ────────────────────────────────────────────────────

  {
    id: 'lang-sentence-fill',
    type: 'sentence_completion',
    domain: 'language',
    name: 'Sentence Completion',
    description: 'Fill in the missing words to complete the sentence',
    difficulty: 2,
    durationSeconds: 45,
    parameters: {},
    inputType: 'word-bank' as const,
    wordBankData: {
      sentence: 'Scientists use a ____ to see objects too small for the naked ____.',
      answers: ['microscope', 'eye'],
      bankWords: ['microscope', 'telescope', 'eye', 'ear', 'hand', 'laboratory'],
    },
    scoringRubric: '',
    conversationalBridges: [
      "Fill in the blanks — this one tests your vocabulary and sentence comprehension.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Sentence Fill: 'Scientists use a ____ to see objects too small for the naked ____.' Answers: microscope, eye. Score 1 per correct blank. normalizedScore = (correct/2)*100.",
    standalonePrompt: '',
  },

  {
    id: 'lang-proverb-mcq',
    type: 'pragmatic_language',
    domain: 'language',
    name: 'Proverb Meaning',
    description: 'Select the correct meaning of a common proverb',
    difficulty: 3,
    durationSeconds: 30,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'Even bad situations have a positive aspect', isCorrect: true },
      { id: 'b', text: 'Weather always improves eventually', isCorrect: false },
      { id: 'c', text: 'Clouds contain silver minerals', isCorrect: false },
      { id: 'd', text: 'Optimists see storms differently', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Let's look at a proverb — these test language comprehension and abstract thinking.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Proverb: Ask 'What does \"Every cloud has a silver lining\" mean?' Correct: Even bad situations have a positive aspect. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'What does this proverb mean?\n\n"Every cloud has a silver lining"',
  },

  // ── VISUOSPATIAL ────────────────────────────────────────────────

  {
    id: 'vs-shape-pattern',
    type: 'pattern_recognition',
    domain: 'visuospatial',
    name: 'Shape Pattern',
    description: 'Identify the rule in a shape sequence and choose what comes next',
    difficulty: 2,
    durationSeconds: 30,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'Hexagon (6 sides)', isCorrect: true },
      { id: 'b', text: 'Circle (0 sides)', isCorrect: false },
      { id: 'c', text: 'Heptagon (7 sides)', isCorrect: false },
      { id: 'd', text: 'Octagon (8 sides)', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Let's test your pattern recognition — shapes that follow a rule.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Shape Pattern: 'Each shape adds one side: Triangle (3) → Square (4) → Pentagon (5) → ___?' Answer: Hexagon (6). Score 100 correct, 0 incorrect.",
    standalonePrompt:
      'Each shape in this sequence has one more side than the previous.\n\nTriangle → Square → Pentagon → ___?',
  },

  {
    id: 'vs-paper-fold',
    type: 'mental_rotation',
    domain: 'visuospatial',
    name: 'Paper Folding',
    description: 'Mentally fold a piece of paper and count the holes after cutting',
    difficulty: 4,
    durationSeconds: 45,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: '1 hole', isCorrect: false },
      { id: 'b', text: '2 holes', isCorrect: false },
      { id: 'c', text: '3 holes', isCorrect: false },
      { id: 'd', text: '4 holes', isCorrect: true },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "This one requires spatial imagination — imagine folding a piece of paper in your mind.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Paper Fold: 'Fold a square paper in half top-to-bottom, then left-to-right. Cut a hole in the center. How many holes when unfolded?' Answer: 4. Score 100 correct, 0 incorrect.",
    standalonePrompt:
      "Take a square piece of paper:\n1. Fold it in half top-to-bottom\n2. Fold it in half again left-to-right\n3. Cut one hole through the center\n\nHow many holes appear when you unfold it?",
  },
```

- [ ] **Step 3: Verify the exercise-service builds**

```bash
pnpm --filter exercise-service build 2>&1 | tail -20
```

Expected: exits 0. If TypeScript complains about `inputType` not existing on `ExerciseDefinition`, ensure Task 1 was completed first.

- [ ] **Step 4: Commit**

```bash
git add services/exercise-service/src/data/exercises.ts
git commit -m "feat(exercises): add inputType to all exercises, add 12 typed-input exercises across all domains"
```

---

## Task 3: Deterministic Scoring Route (Backend)

**Files:**
- Modify: `services/exercise-service/src/services/exercise.service.ts`
- Modify: `services/exercise-service/src/routes/exercises.ts`

- [ ] **Step 1: Write failing tests**

In `services/exercise-service/src/__tests__/exercises.test.ts`, add a new `describe` block:

```typescript
describe('POST /api/exercises/:id/score-typed', () => {
  let mcqSessionId: string;
  let wbSessionId: string;
  let seqSessionId: string;

  before(async () => {
    // Create sessions for a known MCQ exercise, word-bank exercise, and sequence exercise
    // Use the seeded test user token (same pattern as existing tests)
    const mcqRes = await request(app)
      .get('/api/exercises/next')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);
    // The adaptive selector may not return a typed exercise on first call.
    // Instead insert sessions directly using the DB for deterministic testing:
    const [mcqSession] = await db.insert(exerciseSessions).values({
      userId: testUserId,
      exerciseId: 'attn-stroop-color',   // multiple-choice exercise
      domain: 'attention',
      difficulty: 2,
    }).returning();
    mcqSessionId = mcqSession.id;

    const [wbSession] = await db.insert(exerciseSessions).values({
      userId: testUserId,
      exerciseId: 'lang-sentence-fill',  // word-bank exercise
      domain: 'language',
      difficulty: 2,
    }).returning();
    wbSessionId = wbSession.id;

    const [seqSession] = await db.insert(exerciseSessions).values({
      userId: testUserId,
      exerciseId: 'mem-digit-span',      // sequence-recall exercise
      domain: 'memory',
      difficulty: 2,
    }).returning();
    seqSessionId = seqSession.id;
  });

  it('scores a correct multiple-choice answer as 100', async () => {
    const res = await request(app)
      .post(`/api/exercises/${mcqSessionId}/score-typed`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        answer: { inputType: 'multiple-choice', selectedOptionId: 'a' }, // 'a' = Blue = correct
        durationSeconds: 5,
      })
      .expect(200);

    assert.strictEqual(res.body.normalizedScore, 100);
    assert.strictEqual(res.body.rawScore, 1);
    assert.ok(res.body.feedback.length > 0);
    assert.ok(res.body.exerciseSessionId);
  });

  it('scores an incorrect multiple-choice answer as 0', async () => {
    const [session2] = await db.insert(exerciseSessions).values({
      userId: testUserId,
      exerciseId: 'attn-stroop-color',
      domain: 'attention',
      difficulty: 2,
    }).returning();

    const res = await request(app)
      .post(`/api/exercises/${session2.id}/score-typed`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        answer: { inputType: 'multiple-choice', selectedOptionId: 'b' }, // wrong
        durationSeconds: 5,
      })
      .expect(200);

    assert.strictEqual(res.body.normalizedScore, 0);
    assert.strictEqual(res.body.rawScore, 0);
  });

  it('scores a fully correct word-bank answer as 100', async () => {
    const res = await request(app)
      .post(`/api/exercises/${wbSessionId}/score-typed`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        answer: { inputType: 'word-bank', filledBlanks: ['microscope', 'eye'] },
        durationSeconds: 8,
      })
      .expect(200);

    assert.strictEqual(res.body.normalizedScore, 100);
    assert.strictEqual(res.body.rawScore, 2);
  });

  it('scores a partially correct word-bank answer proportionally', async () => {
    const [session3] = await db.insert(exerciseSessions).values({
      userId: testUserId,
      exerciseId: 'lang-sentence-fill',
      domain: 'language',
      difficulty: 2,
    }).returning();

    const res = await request(app)
      .post(`/api/exercises/${session3.id}/score-typed`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        answer: { inputType: 'word-bank', filledBlanks: ['microscope', 'ear'] }, // second wrong
        durationSeconds: 8,
      })
      .expect(200);

    assert.strictEqual(res.body.normalizedScore, 50);
    assert.strictEqual(res.body.rawScore, 1);
  });

  it('scores a perfect sequence-recall answer as 100', async () => {
    const res = await request(app)
      .post(`/api/exercises/${seqSessionId}/score-typed`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        answer: { inputType: 'sequence-recall', sequence: ['4', '7', '2', '9', '1', '6'] },
        durationSeconds: 10,
      })
      .expect(200);

    assert.strictEqual(res.body.normalizedScore, 100);
    assert.strictEqual(res.body.rawScore, 6);
  });

  it('scores a partial sequence-recall answer proportionally', async () => {
    const [session4] = await db.insert(exerciseSessions).values({
      userId: testUserId,
      exerciseId: 'mem-digit-span',
      domain: 'memory',
      difficulty: 2,
    }).returning();

    const res = await request(app)
      .post(`/api/exercises/${session4.id}/score-typed`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        answer: { inputType: 'sequence-recall', sequence: ['4', '7', '9', '2', '1', '6'] }, // positions 2&3 swapped
        durationSeconds: 10,
      })
      .expect(200);

    // 4=correct, 7=correct, 9≠2, 2≠9, 1=correct, 6=correct → 4/6
    assert.strictEqual(res.body.rawScore, 4);
    assert.ok(Math.abs(res.body.normalizedScore - 66.67) < 1);
  });

  it('returns 404 for an unknown session', async () => {
    await request(app)
      .post('/api/exercises/00000000-0000-0000-0000-000000000000/score-typed')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        answer: { inputType: 'multiple-choice', selectedOptionId: 'a' },
        durationSeconds: 5,
      })
      .expect(404);
  });

  it('returns 409 if session already completed', async () => {
    // score the MCQ session again (already completed in first test)
    await request(app)
      .post(`/api/exercises/${mcqSessionId}/score-typed`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        answer: { inputType: 'multiple-choice', selectedOptionId: 'a' },
        durationSeconds: 5,
      })
      .expect(409);
  });

  it('returns 400 when answer inputType mismatches exercise', async () => {
    const [session5] = await db.insert(exerciseSessions).values({
      userId: testUserId,
      exerciseId: 'attn-stroop-color',  // multiple-choice exercise
      domain: 'attention',
      difficulty: 2,
    }).returning();

    await request(app)
      .post(`/api/exercises/${session5.id}/score-typed`)
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        answer: { inputType: 'sequence-recall', sequence: ['a', 'b'] }, // wrong type
        durationSeconds: 5,
      })
      .expect(400);
  });
});
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
pnpm --filter exercise-service test 2>&1 | grep "score-typed"
```

Expected: tests fail with `404` (route not found yet).

- [ ] **Step 3: Implement `scoreTyped` in the exercise service**

In `services/exercise-service/src/services/exercise.service.ts`, add this function inside `createExerciseService`:

```typescript
async function scoreTyped(
  sessionId: string,
  userId: string,
  answer: TypedAnswer,
  durationSeconds: number,
): Promise<ExerciseResult> {
  const session = await db.query.exerciseSessions.findFirst({
    where: eq(exerciseSessions.id, sessionId),
  });
  if (!session) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
  if (session.userId !== userId) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
  if (session.completedAt) throw Object.assign(new Error('Already completed'), { code: 'CONFLICT' });

  const exercise = getExerciseById(session.exerciseId);
  if (!exercise) throw Object.assign(new Error('Exercise not found'), { code: 'NOT_FOUND' });

  const effectiveType = exercise.inputType ?? 'free-text';
  if (answer.inputType !== effectiveType) {
    throw Object.assign(
      new Error(`Answer type '${answer.inputType}' does not match exercise type '${effectiveType}'`),
      { code: 'BAD_REQUEST' },
    );
  }

  let rawScore: number;
  let normalizedScore: number;
  let feedback: string;

  if (answer.inputType === 'multiple-choice') {
    const correct = exercise.options?.find((o) => o.id === answer.selectedOptionId)?.isCorrect ?? false;
    rawScore = correct ? 1 : 0;
    normalizedScore = correct ? 100 : 0;
    feedback = correct
      ? 'Correct! Sharp thinking.'
      : 'Not quite — keep practicing, you\'ll get it!';
  } else if (answer.inputType === 'word-bank') {
    const expected = exercise.wordBankData?.answers ?? [];
    const correctCount = answer.filledBlanks.filter(
      (w, i) => w.toLowerCase().trim() === expected[i]?.toLowerCase().trim(),
    ).length;
    rawScore = correctCount;
    normalizedScore = expected.length > 0 ? Math.round((correctCount / expected.length) * 100) : 0;
    feedback =
      normalizedScore === 100
        ? 'Perfect — all blanks filled correctly!'
        : `${correctCount} of ${expected.length} correct — good effort!`;
  } else {
    // sequence-recall
    const expected = exercise.sequenceItems ?? [];
    const correctCount = answer.sequence.filter((item, i) => item === expected[i]).length;
    rawScore = correctCount;
    normalizedScore = expected.length > 0
      ? Math.round((correctCount / expected.length) * 10000) / 100  // 2 decimal places
      : 0;
    feedback =
      normalizedScore === 100
        ? 'Perfect recall — outstanding!'
        : `${correctCount} of ${expected.length} in the right order — great effort!`;
  }

  const userResponseStr = JSON.stringify(answer);

  await db
    .update(exerciseSessions)
    .set({
      rawScore,
      normalizedScore,
      userResponse: userResponseStr,
      durationSeconds,
      completedAt: new Date(),
      metadata: { feedback },
    })
    .where(eq(exerciseSessions.id, sessionId));

  return {
    exerciseSessionId: sessionId,
    rawScore,
    normalizedScore,
    domain: session.domain,
    feedback,
  };
}
```

Also add `scoreTyped` to the returned object:

```typescript
return {
  getNextExercise,
  submitExercise,
  scoreStandalone,
  scoreTyped,        // ← add this line
  getHistory,
  getStats,
  getTrends,
};
```

The imports needed at the top of the service file (add to existing imports):
```typescript
import type { TypedAnswer } from '@cogniguard/types';
```

- [ ] **Step 4: Add the route**

In `services/exercise-service/src/routes/exercises.ts`, add after the existing `score-standalone` route:

```typescript
const typedScoreSchema = z.object({
  answer: z.union([
    z.object({ inputType: z.literal('multiple-choice'), selectedOptionId: z.string().min(1) }),
    z.object({ inputType: z.literal('word-bank'), filledBlanks: z.array(z.string()) }),
    z.object({ inputType: z.literal('sequence-recall'), sequence: z.array(z.string()) }),
  ]),
  durationSeconds: z.number().positive(),
});

router.post('/:id/score-typed', async (req, res) => {
  const { userId } = req as unknown as AuthRequest;
  const parsed = typedScoreSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid request body' });

  try {
    const result = await exerciseService.scoreTyped(
      req.params.id,
      userId,
      parsed.data.answer as any,
      parsed.data.durationSeconds,
    );
    return res.json(result);
  } catch (err: any) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Session not found' });
    if (err.code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
    if (err.code === 'CONFLICT') return res.status(409).json({ error: 'Already completed' });
    if (err.code === 'BAD_REQUEST') return res.status(400).json({ error: err.message });
    console.error('score-typed error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

- [ ] **Step 5: Run tests — all should pass**

```bash
pnpm --filter exercise-service test 2>&1 | tail -30
```

Expected: all tests pass including the new `score-typed` suite. The full exercise-service suite should still report 34+ tests passing.

- [ ] **Step 6: Commit**

```bash
git add services/exercise-service/src/services/exercise.service.ts \
        services/exercise-service/src/routes/exercises.ts \
        services/exercise-service/src/__tests__/exercises.test.ts
git commit -m "feat(exercise-service): add score-typed route for deterministic MCQ/word-bank/sequence scoring"
```

---

## Task 4: Mobile API Client

**Files:**
- Modify: `apps/mobile/lib/api.ts`

- [ ] **Step 1: Add the `scoreTyped` method to the `exercises` namespace**

In `apps/mobile/lib/api.ts`, locate the `exercises` object (it already has `next`, `history`, `stats`, `trends`, `submit`, `scoreStandalone`). Add:

```typescript
    scoreTyped: (
      sessionId: string,
      token: string,
      body: { answer: TypedAnswer; durationSeconds: number },
    ) =>
      request<{
        exerciseSessionId: string;
        rawScore: number;
        normalizedScore: number;
        domain: string;
        feedback: string;
      }>(`${API.exercise}/api/exercises/${sessionId}/score-typed`, {
        method: 'POST',
        token,
        body: JSON.stringify(body),
      }),
```

Also import the type at the top of the file:

```typescript
import type { TypedAnswer } from '@cogniguard/types';
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @cogniguard/mobile tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/api.ts
git commit -m "feat(mobile/api): add scoreTyped method for typed exercise submission"
```

---

## Task 5: MultipleChoiceInput Component

**Files:**
- Create: `apps/mobile/components/exercises/MultipleChoiceInput.tsx`

- [ ] **Step 1: Create the component**

```typescript
// apps/mobile/components/exercises/MultipleChoiceInput.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import type { MultipleChoiceOption } from '@cogniguard/types';

interface Props {
  question: string;
  options: MultipleChoiceOption[];
  onSelect: (optionId: string) => void;
}

export function MultipleChoiceInput({ question, options, onSelect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  function handlePress(id: string) {
    setSelected(id);
    onSelect(id);
  }

  return (
    <View style={styles.container}>
      <View style={styles.questionCard}>
        <Text style={styles.question}>{question}</Text>
      </View>

      <View style={styles.options}>
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => handlePress(opt.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.optionDot, isSelected && styles.optionDotSelected]}>
                <Text style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                  {opt.id.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {opt.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  questionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  question: {
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '500',
  },
  options: { gap: 10 },
  option: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  optionDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionDotSelected: {
    backgroundColor: colors.accent,
  },
  optionLetter: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  optionLetterSelected: {
    color: colors.textOnAccent,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: colors.accent,
  },
});
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
pnpm --filter @cogniguard/mobile tsc --noEmit 2>&1 | head -10
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/exercises/MultipleChoiceInput.tsx
git commit -m "feat(mobile): add MultipleChoiceInput exercise component"
```

---

## Task 6: WordBankInput Component

**Files:**
- Create: `apps/mobile/components/exercises/WordBankInput.tsx`

- [ ] **Step 1: Create the component**

```typescript
// apps/mobile/components/exercises/WordBankInput.tsx
import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import type { WordBankData } from '@cogniguard/types';

interface Props {
  wordBankData: WordBankData;
  onChange: (filledBlanks: string[]) => void;
}

export function WordBankInput({ wordBankData, onChange }: Props) {
  const { sentence, bankWords, answers } = wordBankData;
  const blankCount = answers.length;

  // filledBlanks[i] = word placed in blank i, or '' if empty
  const [filledBlanks, setFilledBlanks] = useState<string[]>(Array(blankCount).fill(''));
  // usedIndices tracks which bankWords indices are already placed
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());

  const shuffledBank = useMemo(
    () => [...bankWords].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function fillBlank(wordIndex: number, word: string) {
    // Place word into the first empty blank
    const nextEmpty = filledBlanks.findIndex((b) => b === '');
    if (nextEmpty === -1) return;
    const next = [...filledBlanks];
    next[nextEmpty] = word;
    setFilledBlanks(next);
    setUsedIndices((prev) => new Set([...prev, wordIndex]));
    onChange(next);
  }

  function clearBlank(blankIndex: number) {
    const word = filledBlanks[blankIndex];
    if (!word) return;
    // Find the bank index of this word to un-use it
    const bankIdx = shuffledBank.findIndex((w, i) => w === word && usedIndices.has(i));
    const next = [...filledBlanks];
    next[blankIndex] = '';
    setFilledBlanks(next);
    if (bankIdx !== -1) {
      setUsedIndices((prev) => {
        const s = new Set(prev);
        s.delete(bankIdx);
        return s;
      });
    }
    onChange(next);
  }

  // Split sentence by ____ to render inline blanks
  const parts = sentence.split('____');
  let blankIdx = 0;

  return (
    <View style={styles.container}>
      {/* Sentence with inline blank slots */}
      <View style={styles.sentenceCard}>
        <View style={styles.sentenceRow}>
          {parts.map((part, i) => (
            <View key={i} style={styles.inlineRow}>
              {part.length > 0 && (
                <Text style={styles.sentenceText}>{part}</Text>
              )}
              {i < parts.length - 1 && (() => {
                const idx = blankIdx++;
                const filled = filledBlanks[idx];
                return (
                  <TouchableOpacity
                    style={[styles.blank, filled ? styles.blankFilled : styles.blankEmpty]}
                    onPress={() => filled && clearBlank(idx)}
                    disabled={!filled}
                  >
                    <Text style={filled ? styles.blankFilledText : styles.blankPlaceholder}>
                      {filled || '______'}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          ))}
        </View>
      </View>

      {/* Word bank */}
      <Text style={styles.bankLabel}>Word Bank</Text>
      <View style={styles.bank}>
        {shuffledBank.map((word, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.chip, usedIndices.has(i) && styles.chipUsed]}
            onPress={() => !usedIndices.has(i) && fillBlank(i, word)}
            disabled={usedIndices.has(i)}
          >
            <Text style={[styles.chipText, usedIndices.has(i) && styles.chipTextUsed]}>
              {word}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  sentenceCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sentenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  sentenceText: {
    fontSize: 17,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  blank: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 3,
    borderWidth: 2,
    minWidth: 80,
    alignItems: 'center',
  },
  blankEmpty: {
    borderColor: colors.borderMedium,
    borderStyle: 'dashed',
    backgroundColor: colors.cardMuted,
  },
  blankFilled: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  blankPlaceholder: {
    color: colors.textTertiary,
    fontSize: 15,
    letterSpacing: 2,
  },
  blankFilledText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  bankLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  chipUsed: {
    backgroundColor: colors.cardMuted,
    borderColor: colors.borderLight,
    opacity: 0.4,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  chipTextUsed: {
    color: colors.textTertiary,
  },
});
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
pnpm --filter @cogniguard/mobile tsc --noEmit 2>&1 | head -10
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/exercises/WordBankInput.tsx
git commit -m "feat(mobile): add WordBankInput exercise component"
```

---

## Task 7: SequenceRecallInput Component

**Files:**
- Create: `apps/mobile/components/exercises/SequenceRecallInput.tsx`

- [ ] **Step 1: Create the component**

```typescript
// apps/mobile/components/exercises/SequenceRecallInput.tsx
import { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors } from '@/constants/theme';

type Phase = 'study' | 'recall';

interface Props {
  items: string[];
  displayMs?: number;
  onChange: (sequence: string[]) => void;
}

export function SequenceRecallInput({ items, displayMs = 4000, onChange }: Props) {
  const [phase, setPhase] = useState<Phase>('study');
  const [countdown, setCountdown] = useState(Math.ceil(displayMs / 1000));
  const [selected, setSelected] = useState<string[]>([]);
  const progress = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shuffled pool of items for recall phase (items + no distractors — just the real items shuffled)
  // For better UX, show items shuffled so user can't just memorize position
  const shuffled = useMemo(
    () => [...items].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    // Animate the progress bar draining
    Animated.timing(progress, {
      toValue: 0,
      duration: displayMs,
      useNativeDriver: false,
    }).start();

    // Countdown tick
    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(intervalRef.current!);
          setPhase('recall');
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function tapItem(item: string) {
    if (selected.includes(item)) return;
    const next = [...selected, item];
    setSelected(next);
    onChange(next);
  }

  function removeLastItem() {
    const next = selected.slice(0, -1);
    setSelected(next);
    onChange(next);
  }

  if (phase === 'study') {
    return (
      <View style={styles.studyContainer}>
        <Text style={styles.studyInstruction}>Memorize this sequence</Text>
        <View style={styles.sequenceCard}>
          <View style={styles.sequenceRow}>
            {items.map((item, i) => (
              <View key={i} style={styles.sequenceItem}>
                <Text style={styles.sequenceText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.countdown}>{countdown}s</Text>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.recallContainer}>
      {/* Selected sequence so far */}
      <View style={styles.answerCard}>
        <Text style={styles.answerLabel}>Your sequence</Text>
        <View style={styles.answerRow}>
          {selected.length === 0 ? (
            <Text style={styles.answerPlaceholder}>Tap items below in order…</Text>
          ) : (
            selected.map((item, i) => (
              <View key={i} style={styles.answerBubble}>
                <Text style={styles.answerBubbleText}>{item}</Text>
              </View>
            ))
          )}
        </View>
        {selected.length > 0 && (
          <TouchableOpacity style={styles.undoButton} onPress={removeLastItem}>
            <Text style={styles.undoText}>Undo last</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tappable items */}
      <Text style={styles.bankLabel}>Tap in the correct order</Text>
      <View style={styles.itemGrid}>
        {shuffled.map((item) => {
          const isUsed = selected.includes(item);
          return (
            <TouchableOpacity
              key={item}
              style={[styles.itemChip, isUsed && styles.itemChipUsed]}
              onPress={() => tapItem(item)}
              disabled={isUsed}
            >
              <Text style={[styles.itemText, isUsed && styles.itemTextUsed]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  studyContainer: { gap: 16, alignItems: 'center' },
  studyInstruction: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sequenceCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  sequenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  sequenceItem: {
    backgroundColor: colors.accentDim,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sequenceText: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
  },
  countdown: {
    color: colors.textTertiary,
    fontSize: 14,
    fontWeight: '600',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  recallContainer: { gap: 16 },
  answerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 10,
  },
  answerLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  answerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 40,
    alignItems: 'center',
  },
  answerPlaceholder: {
    color: colors.textTertiary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  answerBubble: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  answerBubbleText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '600',
  },
  undoButton: {
    alignSelf: 'flex-start',
  },
  undoText: {
    color: colors.textTertiary,
    fontSize: 13,
  },
  bankLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  itemChip: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  itemChipUsed: {
    opacity: 0.35,
    backgroundColor: colors.cardMuted,
  },
  itemText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  itemTextUsed: {
    color: colors.textTertiary,
  },
});
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
pnpm --filter @cogniguard/mobile tsc --noEmit 2>&1 | head -10
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/exercises/SequenceRecallInput.tsx
git commit -m "feat(mobile): add SequenceRecallInput component with study/recall phases"
```

---

## Task 8: Refactor Solo Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/solo.tsx`

The solo screen currently renders a single free-text `TextInput` for all exercises. Refactor it to:
1. Extract the free-text input into a local `FreeTextInput` inline or import it
2. Route to the correct exercise component based on `exercise.inputType`
3. Submit to the correct API endpoint

- [ ] **Step 1: Update imports and state in `solo.tsx`**

Replace the existing import block and add new ones:

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { MultipleChoiceInput } from '@/components/exercises/MultipleChoiceInput';
import { WordBankInput } from '@/components/exercises/WordBankInput';
import { SequenceRecallInput } from '@/components/exercises/SequenceRecallInput';
import type { TypedAnswer, MultipleChoiceOption, WordBankData } from '@cogniguard/types';
```

Update the `Exercise` interface to include the typed-input fields:

```typescript
interface Exercise {
  id: string;
  domain: string;
  name: string;
  standalonePrompt: string;
  inputType: 'free-text' | 'multiple-choice' | 'word-bank' | 'sequence-recall';
  options?: MultipleChoiceOption[];
  wordBankData?: WordBankData;
  sequenceItems?: string[];
  sequenceDisplayMs?: number;
}
```

Add a `typedAnswer` state alongside `userResponse`:

```typescript
const [typedAnswer, setTypedAnswer] = useState<TypedAnswer | null>(null);
```

- [ ] **Step 2: Update `loadExercise` to map all new fields**

In the `loadExercise` callback, update the object set on `setExercise`:

```typescript
setExercise({
  id: data.exercise.id,
  domain: data.exercise.domain,
  name: data.exercise.name,
  standalonePrompt: (data.exercise as any).standalonePrompt ?? data.exercise.systemPromptFragment,
  inputType: (data.exercise as any).inputType ?? 'free-text',
  options: (data.exercise as any).options,
  wordBankData: (data.exercise as any).wordBankData,
  sequenceItems: (data.exercise as any).sequenceItems,
  sequenceDisplayMs: (data.exercise as any).sequenceDisplayMs,
});
// Also reset typedAnswer when loading a new exercise
setTypedAnswer(null);
```

- [ ] **Step 3: Update `handleSubmit` to call the correct endpoint**

Replace the existing `handleSubmit` with:

```typescript
const handleSubmit = useCallback(async () => {
  if (!token || !sessionId) return;
  const isFreeText = exercise?.inputType === 'free-text' || !exercise?.inputType;

  if (isFreeText && !userResponse.trim()) return;
  if (!isFreeText && !typedAnswer) return;

  stopTimer();
  const durationSeconds = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
  setPhase('submitting');

  try {
    let data: Result;
    if (isFreeText) {
      const res = await api.exercises.scoreStandalone(sessionId, token, {
        userResponse: userResponse.trim(),
        durationSeconds,
      });
      data = res;
    } else {
      const res = await api.exercises.scoreTyped(sessionId, token, {
        answer: typedAnswer!,
        durationSeconds,
      });
      data = {
        rawScore: res.rawScore,
        normalizedScore: res.normalizedScore,
        domain: res.domain,
        feedback: res.feedback,
      };
    }
    setResult(data);
    setPhase('result');
  } catch {
    Alert.alert('Error', 'Could not submit response. Please try again.');
    setPhase('ready');
  }
}, [token, sessionId, userResponse, typedAnswer, exercise, stopTimer]);
```

- [ ] **Step 4: Update the render to show the correct input component**

Replace the existing exercise render (the `return` block at the bottom for the `ready`/`submitting` phase) with:

```typescript
const isFreeText = exercise?.inputType === 'free-text' || !exercise?.inputType;
const canSubmit = isFreeText ? userResponse.trim().length > 0 : typedAnswer !== null;

return (
  <KeyboardAvoidingView
    style={styles.flex}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={insets.top + 44}
  >
    <ScrollView
      contentContainerStyle={styles.exerciseContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.exerciseName} testID="exercise-name">{exercise?.name}</Text>
        <Text style={styles.timer} testID="elapsed-timer">{elapsed}s</Text>
      </View>

      {isFreeText && (
        <>
          <Text style={styles.prompt} testID="exercise-prompt">{exercise?.standalonePrompt}</Text>
          <TextInput
            style={styles.input}
            multiline
            placeholder="Type your response here…"
            placeholderTextColor={colors.textTertiary}
            value={userResponse}
            onChangeText={setUserResponse}
            testID="response-input"
          />
        </>
      )}

      {exercise?.inputType === 'multiple-choice' && exercise.options && (
        <MultipleChoiceInput
          question={exercise.standalonePrompt}
          options={exercise.options}
          onSelect={(id) => setTypedAnswer({ inputType: 'multiple-choice', selectedOptionId: id })}
        />
      )}

      {exercise?.inputType === 'word-bank' && exercise.wordBankData && (
        <WordBankInput
          wordBankData={exercise.wordBankData}
          onChange={(blanks) => {
            const allFilled = blanks.every((b) => b !== '');
            setTypedAnswer(allFilled ? { inputType: 'word-bank', filledBlanks: blanks } : null);
          }}
        />
      )}

      {exercise?.inputType === 'sequence-recall' && exercise.sequenceItems && (
        <SequenceRecallInput
          items={exercise.sequenceItems}
          displayMs={exercise.sequenceDisplayMs}
          onChange={(seq) => {
            const complete = seq.length === exercise.sequenceItems!.length;
            setTypedAnswer(complete ? { inputType: 'sequence-recall', sequence: seq } : null);
          }}
        />
      )}
    </ScrollView>

    <View style={styles.submitBar}>
      {isFreeText && userResponse.trim().length > 0 && (
        <TouchableOpacity style={styles.dismissButton} onPress={Keyboard.dismiss}>
          <Text style={styles.dismissText}>Done typing</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={phase === 'submitting' || !canSubmit}
        testID="submit-btn"
      >
        {phase === 'submitting'
          ? <ActivityIndicator color={colors.textOnAccent} />
          : <Text style={styles.submitButtonText}>Submit Answer</Text>}
      </TouchableOpacity>
    </View>
  </KeyboardAvoidingView>
);
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
pnpm --filter @cogniguard/mobile tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 6: Manual smoke test**

With the app running on simulator:
1. Open the Solo tab — confirm a free-text exercise still loads for existing `free-text` exercises
2. Tap through exercises (Next Exercise) until an MCQ, word-bank, or sequence-recall exercise appears
3. For MCQ: tap an option, confirm Submit activates, submit, confirm result screen
4. For word-bank: tap chips to fill blanks, confirm Submit activates when all filled
5. For sequence-recall: confirm study phase shows items with countdown → automatically transitions to recall phase → tap items in order → Submit activates

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/(tabs)/solo.tsx
git commit -m "feat(mobile/solo): route to typed exercise components based on inputType, submit to correct endpoint"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Multiple-choice input type — implemented (Task 5, Task 8)
- ✅ Word-bank input type — implemented (Task 6, Task 8)
- ✅ Sequence-recall input type — implemented (Task 7, Task 8)
- ✅ 12 new exercises across all 6 domains — implemented (Task 2)
- ✅ Deterministic backend scoring (no Claude for MCQ/word-bank/sequence) — implemented (Task 3)
- ✅ Existing free-text exercises unchanged — `inputType: 'free-text'` added, no behavior change
- ✅ Scoring stored in DB same way as before (`completedAt`, `normalizedScore`, `rawScore`, `metadata.feedback`)
- ✅ History screen picks up new sessions automatically (no changes needed)

**Type consistency check:**
- `TypedAnswer` defined in Task 1, imported in Tasks 3, 4, 8 — consistent
- `MultipleChoiceOption` defined in Task 1, used in Task 5 and Task 8 — consistent
- `WordBankData` defined in Task 1, used in Task 6 and Task 8 — consistent
- `scoreTyped` method name used in Task 3 (service), Task 3 (route), Task 4 (API client), Task 8 (solo screen) — consistent

**No placeholders:** All steps contain actual code, exact commands, and expected output.
