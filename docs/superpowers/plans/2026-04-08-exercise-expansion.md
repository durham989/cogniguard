# Exercise Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 new exercise types targeting underserved dementia-prevention domains: dual-task performance (divided attention), social cognition / theory of mind, prospective memory, and analogical reasoning. These expand the protocol from 18 to 24 exercises and add coverage supported directly by Lancet Commission research.

**Architecture:** New `ExerciseType` string literals added to `packages/types`, new `ExerciseDefinition` entries added to `services/exercise-service/src/data/exercises.ts`. No new tables, routes, or services needed. The `packages/types` dist must be rebuilt after the type change.

**Tech Stack:** TypeScript, existing exercise data structure

---

## The Six New Exercises

| ID | Type | Domain | Difficulty |
|---|---|---|---|
| `att-dual-task-verbal` | `dual_task_verbal` | attention | 3 |
| `att-dual-task-inhibition` | `dual_task_inhibition` | executive_function | 4 |
| `lang-social-emotion` | `social_cognition_emotion` | language | 2 |
| `lang-social-tom` | `social_cognition_tom` | language | 3 |
| `mem-prospective` | `prospective_memory` | memory | 3 |
| `exec-analogical` | `analogical_reasoning` | executive_function | 2 |

---

## File Map

- Modify: `packages/types/src/exercise.ts` — add 6 new `ExerciseType` string literals
- Modify: `services/exercise-service/src/data/exercises.ts` — add 6 new `ExerciseDefinition` objects
- Run: `npm run build` in `packages/types` — rebuild dist so exercise-service picks up the new types

---

### Task 1: Add new ExerciseType values to shared types

**Files:**
- Modify: `packages/types/src/exercise.ts`

- [ ] **Step 1: Add to the ExerciseType union**

In `packages/types/src/exercise.ts`, extend the `ExerciseType` union. Add the 6 new literals after `'pattern_description'`:

```typescript
export type ExerciseType =
  | 'word_list_recall'
  | 'story_retelling'
  | 'n_back'
  | 'digit_span'
  | 'stroop_variant'
  | 'odd_one_out'
  | 'rapid_categorization'
  | 'number_sequence'
  | 'letter_search'
  | 'category_switching'
  | 'tower_verbal'
  | 'verbal_inhibition'
  | 'category_fluency'
  | 'letter_fluency'
  | 'sentence_completion'
  | 'mental_rotation_verbal'
  | 'direction_following'
  | 'pattern_description'
  | 'dual_task_verbal'
  | 'dual_task_inhibition'
  | 'social_cognition_emotion'
  | 'social_cognition_tom'
  | 'prospective_memory'
  | 'analogical_reasoning';
```

- [ ] **Step 2: Rebuild packages/types**

```bash
cd packages/types && npm run build
```

Expected: no errors, `dist/exercise.d.ts` updated with the new union members.

- [ ] **Step 3: Commit**

```bash
cd packages/types
git add src/exercise.ts dist/
git commit -m "feat(types): add dual-task, social cognition, prospective memory, analogical reasoning ExerciseTypes"
```

---

### Task 2: Add the 6 new exercise definitions

**Files:**
- Modify: `services/exercise-service/src/data/exercises.ts`

Background: Each exercise definition must include all required fields: `id`, `type`, `domain`, `name`, `description`, `difficulty`, `durationSeconds`, `parameters`, `scoringRubric`, `conversationalBridges` (3 items), `systemPromptFragment`, `standalonePrompt`.

The `scoringRubric` field is used by the Claude scorer (`claude.service.ts`) via `POST /exercises/:id/score-standalone`. It must be self-contained: the rubric alone (with the user's response) must give Claude enough to compute `rawScore`, `normalizedScore`, and `feedback` with no ambiguity.

- [ ] **Step 1: Add a new section for dual-task exercises**

Append to the `EXERCISES` array in `services/exercise-service/src/data/exercises.ts`, after the last existing entry:

```typescript
  // ─── DUAL TASK (2) ────────────────────────────────────────────────────────
  {
    id: 'att-dual-task-verbal',
    type: 'dual_task_verbal',
    domain: 'attention',
    name: 'Dual-Task Word Monitor',
    description: 'Track colour words AND count living things simultaneously in a word sequence',
    difficulty: 3,
    durationSeconds: 90,
    parameters: { sequenceLength: 12, targets: ['colour', 'living'] },
    scoringRubric: `Sequence: blue / hammer / robin / green / stone / daisy / red / cloud / oak / yellow / river / swallow

Correct colours (words 1,4,7,10): blue, green, red, yellow → 4 total
Correct living things (words 3,6,9,12): robin, daisy, oak, swallow → 4 total

The user lists identified colours and gives a count of living things (or vice versa).
Colour score (0–4): count correctly identified colour words minus false positives, clamped to 0.
Living score (0–4): check their stated count against 4, award 4 if exact, 3 if off by 1, 2 if off by 2, else 0.
rawScore = colour score + living score (0–8).
normalizedScore = (rawScore / 8) * 100.
Return JSON: {"rawScore": <number>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "I love a good multitasking challenge. I'll read a list of words — while I do, spot every colour word AND keep a silent count of living things. Ready?",
      "Here's something that really works your divided attention. Two tasks at once — identify colour words as I say them, and tally up the living things at the end.",
      "This one's a classic in cognitive research. I'll give you a word sequence — track the colours out loud and tell me how many living things appeared at the end.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Dual-Task Word Monitor:
Read these words one at a time: blue / hammer / robin / green / stone / daisy / red / cloud / oak / yellow / river / swallow.
Ask user to: (a) call out each colour word as they hear it, (b) at the end say how many living things appeared.
Correct colours: blue, green, red, yellow (4). Correct living thing count: 4 (robin, daisy, oak, swallow).
Score as per rubric. Output EXACTLY on its own line:
EXERCISE_SCORE: {"rawScore": <0-8>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Dual-Task Challenge — do both things at once:\n\n**Task A:** As you read each word, write "C" next to any word that is a COLOUR.\n**Task B:** At the end, state how many LIVING THINGS appeared in the list.\n\nWord sequence:\nblue / hammer / robin / green / stone / daisy / red / cloud / oak / yellow / river / swallow\n\nFormat your answer like this:\nColours: [list the colour words]\nLiving things count: [your number]`,
  },
  {
    id: 'att-dual-task-inhibition',
    type: 'dual_task_inhibition',
    domain: 'executive_function',
    name: 'Respond and Inhibit',
    description: 'Respond to every word except animals, while counting the total words',
    difficulty: 4,
    durationSeconds: 120,
    parameters: { sequenceLength: 10, inhibitCategory: 'animal' },
    scoringRubric: `Sequence (10 words): table / horse / lamp / cat / chair / dog / book / fish / pen / frog

Non-animal words (correct "yes"): table(1), lamp(3), chair(5), book(7), pen(9) — 5 targets.
Animal words (should NOT respond / say "no" or skip): horse(2), cat(4), dog(6), fish(8), frog(10) — 5 animals.
Total word count = 10.

Score the response:
inhibition_correct = animals the user correctly suppressed (did not say "yes" for) out of 5.
response_correct = non-animals the user correctly responded "yes" to out of 5.
count_correct = 1 if user gives total count of 10, else 0.
rawScore = inhibition_correct + response_correct + count_correct (0–11).
normalizedScore = (rawScore / 11) * 100.
Return JSON: {"rawScore": <number>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "This one really pushes your executive control. Say 'yes' to every word I read — EXCEPT animals. And keep a silent count of the total. Ready?",
      "Here's a classic response inhibition task with a twist — respond to everything except animals, and tell me the total count at the end.",
      "Divided attention and impulse control together. Say 'yes' to each word — but NOT if it's an animal. And count everything as you go.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Respond and Inhibit:
Read one at a time: table / horse / lamp / cat / chair / dog / book / fish / pen / frog.
User should say "yes" to each word EXCEPT animals (horse, cat, dog, fish, frog), and state the total word count (10) at the end.
Score per rubric. Output EXACTLY on its own line:
EXERCISE_SCORE: {"rawScore": <0-11>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Response Inhibition + Counting\n\nRules:\n1. For each word below, write "yes" — UNLESS it is an animal, in which case write "no".\n2. At the very end, state the total number of words in the list.\n\nWords:\ntable / horse / lamp / cat / chair / dog / book / fish / pen / frog\n\nFormat:\ntable: ___\nhorse: ___\nlamp: ___\ncat: ___\nchair: ___\ndog: ___\nbook: ___\nfish: ___\npen: ___\nfrog: ___\nTotal words: ___`,
  },

  // ─── SOCIAL COGNITION (2) ──────────────────────────────────────────────────
  {
    id: 'lang-social-emotion',
    type: 'social_cognition_emotion',
    domain: 'language',
    name: 'Reading Emotional Cues',
    description: 'Infer emotions and motivations from a verbal social scenario',
    difficulty: 2,
    durationSeconds: 90,
    parameters: { scenarioType: 'emotion_inference' },
    scoringRubric: `Scenario: Sarah has spent months preparing for her violin recital. The night before, she learns the venue has double-booked the date and the recital is cancelled. When she calls her mother, her voice is steady but she keeps pausing mid-sentence.

Scoring criteria (total 5 points):
1. Primary emotion identified correctly (disappointment/grief/sadness/devastation variants) — 0 or 2 points.
2. Why she pauses: controlled emotion, trying not to cry, holding herself together — 0 or 2 points.
3. Nuance: acknowledges she is hiding or suppressing her true feelings — 0 or 1 point.
rawScore = sum of above (0–5). normalizedScore = (rawScore / 5) * 100.
Return JSON: {"rawScore": <number>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Here's a scenario I'd love your take on — it's about reading what someone is really feeling beneath the surface.",
      "Social perception is a huge part of cognitive health. Let me describe a situation and you tell me what you think is really going on emotionally.",
      "I'm curious how you read people. I'll describe a scenario — tell me what emotion you pick up on and why.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Reading Emotional Cues:
Tell this scenario: "Sarah has spent months preparing for her violin recital. The night before, she learns the venue has double-booked the date and the recital is cancelled. When she calls her mother, her voice is steady but she keeps pausing mid-sentence."
Ask: What emotion do you think Sarah is feeling? Why do you think she keeps pausing?
Score per rubric. Output EXACTLY on its own line:
EXERCISE_SCORE: {"rawScore": <0-5>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Read the following scenario and answer both questions:\n\n**Scenario:** Sarah has spent months preparing for her violin recital. The night before, she learns the venue has double-booked the date and the recital is cancelled. When she calls her mother to tell her, Sarah's voice is steady — but she keeps pausing mid-sentence.\n\n**Question 1:** What emotion do you think Sarah is most likely feeling? Describe it as specifically as you can.\n\n**Question 2:** Why do you think she keeps pausing mid-sentence? What does that tell you about what's happening inside her?`,
  },
  {
    id: 'lang-social-tom',
    type: 'social_cognition_tom',
    domain: 'language',
    name: 'Theory of Mind',
    description: "Infer what a character believes based on what they do and don't know",
    difficulty: 3,
    durationSeconds: 90,
    parameters: { scenarioType: 'false_belief' },
    scoringRubric: `Scenario: Jake left his keys on the kitchen table before going to the gym. While he was out, his sister moved them to the drawer. Jake does not know this.

Questions asked:
1. When Jake gets home and looks at the table, what will he think?
2. What will Jake do first — look on the table or look in the drawer?
3. How will Jake feel when he looks at the table?

Scoring:
Q1: Jake will think keys are on the table / expect to find them there — 0 or 2 points (must reflect Jake's false belief, not reality).
Q2: Jake will look on the table first — 0 or 1 point.
Q3: Confused / surprised / frustrated — 0 or 2 points (any negative surprise emotion is correct; "fine" is wrong).
rawScore = sum (0–5). normalizedScore = (rawScore / 5) * 100.
Return JSON: {"rawScore": <number>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Here's a little puzzle about how we model other people's minds — one of my favourite topics.",
      "Theory of mind — knowing what others believe — is a fascinating cognitive skill. Let me give you a scenario.",
      "I'd love to hear how you think about what other people know and believe. I'll describe a situation and ask you a few questions.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Theory of Mind:
Tell this scenario: "Jake left his keys on the kitchen table before going to the gym. While he was out, his sister moved them to the drawer. Jake does not know this."
Ask: (1) When Jake gets home and looks at the table, what will he think? (2) Where will Jake look first? (3) How will he feel when he looks at the table?
Score per rubric — critical: Q1 requires Jake's false belief (he thinks keys are on table), not reality. Output EXACTLY on its own line:
EXERCISE_SCORE: {"rawScore": <0-5>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Read the following scenario carefully, then answer the three questions:\n\n**Scenario:** Jake left his keys on the kitchen table before heading to the gym. While he was out, his sister moved them to the kitchen drawer. Jake does not know his sister was there.\n\n**Question 1:** When Jake gets home and looks at the table, what will he think?\n\n**Question 2:** Where will Jake look first for his keys — the table or the drawer? Why?\n\n**Question 3:** How will Jake feel when he looks at the table? Explain your reasoning.`,
  },

  // ─── PROSPECTIVE MEMORY (1) ───────────────────────────────────────────────
  {
    id: 'mem-prospective',
    type: 'prospective_memory',
    domain: 'memory',
    name: 'Remember-to-Do Task',
    description: 'Complete a description task while remembering a specific embedded instruction',
    difficulty: 3,
    durationSeconds: 90,
    parameters: { embeddedCues: 2, taskType: 'description' },
    scoringRubric: `The user was asked to: describe a place they enjoy, include the word "morning" at least once, and end with "That's my description."

Scoring:
1. Description quality — at least 2 specific details mentioned — 0 or 2 points.
2. Word "morning" appears anywhere in the response — 0 or 2 points (exact word required, not "mornings" alone).
3. Response ends with "That's my description." (case-insensitive, punctuation flexible) — 0 or 1 point.
rawScore = sum (0–5). normalizedScore = (rawScore / 5) * 100.
Return JSON: {"rawScore": <number>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "This one tests a type of memory we use every day — remembering to do something in the middle of something else.",
      "Prospective memory — 'remember to do X while doing Y' — is one of the first things to slip with age. Let's exercise it.",
      "Here's a task with a little hidden twist — you'll need to remember two specific things while completing the main task.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Prospective Memory:
Give this instruction: "Describe a place you enjoy visiting. Two rules while you describe it: (1) include the word 'morning' somewhere in your description, and (2) end your response with 'That's my description.' Ready?"
After they respond, score per rubric — check quality, presence of "morning", and the closing phrase. Output EXACTLY on its own line:
EXERCISE_SCORE: {"rawScore": <0-5>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `This is a prospective memory task — you must complete the main task while remembering two specific instructions.\n\n**Main task:** Describe a place you enjoy visiting. Include at least a few details about what it looks, sounds, or feels like.\n\n**Remember while writing:**\n1. Include the word "morning" somewhere in your description.\n2. End your response with exactly: "That's my description."\n\nBegin your description now:`,
  },

  // ─── ANALOGICAL REASONING (1) ─────────────────────────────────────────────
  {
    id: 'exec-analogical',
    type: 'analogical_reasoning',
    domain: 'executive_function',
    name: 'Verbal Analogies',
    description: 'Complete word analogies that require reasoning about relationships between concepts',
    difficulty: 2,
    durationSeconds: 60,
    parameters: { analogyCount: 5 },
    scoringRubric: `Five analogies given. Correct answers:
1. Doctor : hospital :: teacher : school (or classroom)
2. Feather : bird :: scale : fish
3. Morning : breakfast :: night : dinner (or supper / evening meal)
4. Painter : canvas :: sculptor : marble (or clay, stone, chisel)
5. Short : tall :: shallow : deep

Score 1 point per correct analogy. Synonyms and close semantic equivalents count as correct. Unrelated or blank answers score 0.
rawScore = correct count (0–5). normalizedScore = (rawScore / 5) * 100.
Return JSON: {"rawScore": <number>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Analogy completion is one of the best windows into reasoning ability. I'll give you five — complete each one.",
      "Here's a quick reasoning challenge. I'll give you the first part of an analogy — you complete it.",
      "Word analogies are a classic measure of verbal reasoning. Five for you — ready?",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Verbal Analogies:
Present these 5 analogies one at a time or together, ask user to complete each:
1. Doctor is to hospital as teacher is to ___
2. Feather is to bird as scale is to ___
3. Morning is to breakfast as night is to ___
4. Painter is to canvas as sculptor is to ___
5. Short is to tall as shallow is to ___
Score per rubric — accept synonyms. Output EXACTLY on its own line:
EXERCISE_SCORE: {"rawScore": <0-5>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Complete each analogy by filling in the missing word. Write your answer after the colon.\n\n1. Doctor is to hospital as teacher is to ___\n2. Feather is to bird as scale is to ___\n3. Morning is to breakfast as night is to ___\n4. Painter is to canvas as sculptor is to ___\n5. Short is to tall as shallow is to ___\n\nWrite all five answers in your response.`,
  },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd services/exercise-service && pnpm build
```

Expected: no TypeScript errors. If you see `Type '"dual_task_verbal"' is not assignable`, rebuild `packages/types` first:

```bash
cd packages/types && npm run build && cd ../exercise-service && pnpm build
```

- [ ] **Step 3: Run existing tests to confirm nothing regressed**

```bash
cd services/exercise-service && pnpm test
```

Expected: all existing tests still pass (no new tests needed — exercise definitions are data, not code paths).

- [ ] **Step 4: Commit**

```bash
cd services/exercise-service
git add src/data/exercises.ts
git commit -m "feat(exercises): add dual-task, social cognition, prospective memory, and analogical reasoning exercises"
```

---

## Self-Review

**Spec coverage:**
- ✅ Dual-task verbal (attention, difficulty 3): simultaneous colour tracking + living thing count
- ✅ Dual-task inhibition (executive_function, difficulty 4): respond + inhibit + count
- ✅ Social cognition — emotion inference (language, difficulty 2): controlled emotional cues
- ✅ Social cognition — theory of mind (language, difficulty 3): classic false-belief task
- ✅ Prospective memory (memory, difficulty 3): embedded remember-to-do instructions
- ✅ Analogical reasoning (executive_function, difficulty 2): 5-item verbal analogy set
- ✅ All have complete scoringRubric usable by ClaudeScorer
- ✅ All have complete standalonePrompt for Solo mode
- ✅ All have 3 conversationalBridges for Pierre
- ✅ All have complete systemPromptFragment

**Placeholder scan:** No TBDs. All scoring criteria are fully specified with numeric ranges. All analogies have listed acceptable synonyms.

**Type consistency:** New `ExerciseType` literals in `packages/types` match `type` fields in exercise definitions exactly. `domain` values match the existing `cognitiveDomainEnum` values: `'attention'`, `'executive_function'`, `'language'`, `'memory'`.
