import type { ExerciseDefinition, CognitiveDomain } from '@cogniguard/types';

export const EXERCISES: ExerciseDefinition[] = [
  // ─── MEMORY (3) ───────────────────────────────────────────────────────────
  {
    id: 'mem-word-recall',
    type: 'word_list_recall',
    domain: 'memory',
    name: 'Word List Recall',
    description: 'Remember a list of words and recall them after a short delay',
    difficulty: 2,
    durationSeconds: 90,
    parameters: { wordCount: 8, delaySeconds: 30 },
    scoringRubric: `Score the user's recall out of 8 words.
rawScore = number of correctly recalled words (order doesn't matter, minor spelling variations allowed).
normalizedScore = (rawScore / 8) * 100.
Return JSON: {"rawScore": <number>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Speaking of memory — I love little games. I'm going to say 8 words, and after we chat for a minute, I'll ask you to recall as many as you can. Ready?",
      "That reminds me of something fun. Let me give you 8 words to hold in your mind — we'll come back to them shortly. Here they are:",
      "Quick memory warm-up before we continue — I'll say 8 words. Try to remember them all: ",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Word List Recall:
Say these 8 words naturally as part of conversation: apple, bridge, lantern, cloud, violin, marble, forest, kettle.
After about 30 seconds of other conversation, ask the user to recall as many as possible.
When they respond, score per rubric and output EXACTLY this JSON on its own line before your reply:
EXERCISE_SCORE: {"rawScore": <0-8>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Here are 8 words to memorize:\n\napple · bridge · lantern · cloud · violin · marble · forest · kettle\n\nTake 30 seconds to study them. When you're ready, type as many as you can recall (order doesn't matter).`,
  },
  {
    id: 'mem-story-retelling',
    type: 'story_retelling',
    domain: 'memory',
    name: 'Story Retelling',
    description: 'Listen to a short story and retell the main points',
    difficulty: 3,
    durationSeconds: 120,
    parameters: { storyLength: 'short', detailCount: 6 },
    scoringRubric: `Score based on 6 key details captured. rawScore = details correctly recalled (0–6).
normalizedScore = (rawScore / 6) * 100.
Return JSON: {"rawScore": <number>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "I'll share a short story with you — then I'd love to hear you retell it in your own words.",
      "Since we're talking about stories, let me tell you a brief one. After, I'll ask you to retell the key parts.",
      "Here's a fun exercise — I'll tell you something and you tell it back. Ready for a quick story?",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Story Retelling:
Tell this story: "Maria was walking home on Tuesday when she found a blue wallet near the fountain in the park. Inside were three things: a library card, a photo of a dog named Biscuit, and twenty dollars. She brought it to the police station on Oak Street, where Officer Patel took her report."
Key details: Tuesday, blue wallet, fountain in park, library card + photo + $20, police station on Oak Street, Officer Patel.
Ask the user to retell the story. Score which of the 6 details they captured.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-6>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Read this short story carefully:\n\n"Maria was walking home on Tuesday when she found a blue wallet near the fountain in the park. Inside were three things: a library card, a photo of a dog named Biscuit, and twenty dollars. She brought it to the police station on Oak Street, where Officer Patel took her report."\n\nWhen you're ready, retell the story in your own words, including as many details as you can remember.`,
  },
  {
    id: 'mem-n-back',
    type: 'n_back',
    domain: 'memory',
    name: '1-Back Letter Task',
    description: 'Identify when a letter matches the one shown one step back',
    difficulty: 2,
    durationSeconds: 120,
    parameters: { nLevel: 1, sequenceLength: 12 },
    scoringRubric: `Sequence: K,T,K,M,M,P,P,R,T,T,K,K. Matches at positions 3,5,7,10,12 = 5 targets.
rawScore = correct "yes" minus false positives (0–5). normalizedScore = max(0, rawScore/5)*100.
Return JSON: {"rawScore": <number>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Here's a quick focus game. I'll read letters one at a time. Say 'yes' whenever a letter matches the one just before it.",
      "Want to try a classic memory research task? Say 'yes' when the current letter matches the previous one.",
      "Let's wake up the working memory — say 'yes' each time a letter repeats the one right before it.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — 1-Back Letter Task:
Read one letter at a time: K... T... K... M... M... P... P... R... T... T... K... K.
Correct "yes" responses: K(3rd), M(5th), P(7th), T(10th), K(12th). Count correct and false positives.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-5>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `1-Back task: for each letter after the first, type 'yes' if it matches the letter immediately before it, or 'no' if it doesn't.\n\nSequence:  K  T  K  M  M  P  P  R  T  T  K  K\n\nProvide 11 responses (for positions 2–12), separated by commas.\nExample format:  no, yes, no, yes, yes, yes, no, no, yes, yes, yes`,
  },

  // ─── ATTENTION (3) ────────────────────────────────────────────────────────
  {
    id: 'att-digit-span',
    type: 'digit_span',
    domain: 'attention',
    name: 'Digit Span Forward',
    description: 'Repeat sequences of digits in order',
    difficulty: 2,
    durationSeconds: 90,
    parameters: { startLength: 4, maxLength: 8 },
    scoringRubric: `Present sequences 4→5→6→7→8 digits. rawScore = longest correct sequence length.
normalizedScore = ((rawScore - 4) / 4) * 100.
Return JSON: {"rawScore": <4-8>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Quick attention check — I'll say numbers and you repeat them back in the same order. Let's start short.",
      "Number sequences are great for focus. I'll go: ready? Repeat after me.",
      "Quick digit game — I read, you repeat. We'll see how long a string you can hold.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Digit Span Forward:
Read sequences increasing in length. Stop when user fails.
[4-digit: 7 3 9 1] [5-digit: 4 8 2 6 3] [6-digit: 9 1 7 4 2 5] [7-digit: 3 8 6 1 9 4 7] [8-digit: 5 2 8 4 7 1 3 9].
Record the longest sequence correctly repeated.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <4-8>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Read each digit sequence, then type it back in the same order. Work through all five.\n\nSequence 1:  7  3  9  1\nSequence 2:  4  8  2  6  3\nSequence 3:  9  1  7  4  2  5\nSequence 4:  3  8  6  1  9  4  7\nSequence 5:  5  2  8  4  7  1  3  9\n\nType each sequence on a separate line.`,
  },
  {
    id: 'att-stroop',
    type: 'stroop_variant',
    domain: 'attention',
    name: 'Verbal Stroop Task',
    description: 'Name the ink color of words, not the word itself',
    difficulty: 3,
    durationSeconds: 60,
    parameters: { trialCount: 10 },
    scoringRubric: `10 items. rawScore = correct ink colors named. normalizedScore = (rawScore / 10) * 100.
Return JSON: {"rawScore": <0-10>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Ready for a classic brain teaser? I'll describe a word and its ink color — just tell me the ink color, not the word.",
      "There's this famous attention test called Stroop. Tell me the color, not the word.",
      "Let's try something that trips up almost everyone — tell me the ink color, not what the word says.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Verbal Stroop:
Present 10 items as "the word RED written in blue ink" format, one at a time.
Items: [RED/blue] [BLUE/green] [GREEN/red] [YELLOW/purple] [PURPLE/yellow] [RED/green] [BLUE/red] [GREEN/yellow] [YELLOW/blue] [PURPLE/green].
User says ink color. Count correct responses.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-10>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Stroop challenge: type the INK COLOR of each item — not the word.\n\n 1. RED    — ink: BLUE\n 2. BLUE   — ink: GREEN\n 3. GREEN  — ink: RED\n 4. YELLOW — ink: PURPLE\n 5. PURPLE — ink: YELLOW\n 6. RED    — ink: GREEN\n 7. BLUE   — ink: RED\n 8. GREEN  — ink: YELLOW\n 9. YELLOW — ink: BLUE\n10. PURPLE — ink: GREEN\n\nType 10 ink colors in order, separated by commas.`,
  },
  {
    id: 'att-odd-one-out',
    type: 'odd_one_out',
    domain: 'attention',
    name: 'Odd One Out',
    description: 'Identify the item that does not belong in a category',
    difficulty: 2,
    durationSeconds: 90,
    parameters: { rounds: 8 },
    scoringRubric: `8 rounds. rawScore = correct identifications. normalizedScore = (rawScore / 8) * 100.
Return JSON: {"rawScore": <0-8>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Here's a fun categorization game — four things, one doesn't belong. Which is the odd one out?",
      "Quick pattern recognition check: four items, one intruder. Which is it?",
      "I love this puzzle — four things, one doesn't fit. Let's go through 8 rounds.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Odd One Out:
Present 8 rounds one at a time. Answers: 1.[piano,guitar,drum,paintbrush]→paintbrush 2.[eagle,robin,salmon,sparrow]→salmon 3.[Paris,Berlin,Tokyo,Amazon]→Amazon 4.[oxygen,nitrogen,gold,helium]→gold 5.[rose,tulip,oak,sunflower]→oak 6.[January,April,Tuesday,July]→Tuesday 7.[tennis,chess,soccer,basketball]→chess 8.[hammer,saw,wrench,carrot]→carrot.
Count correct responses.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-8>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Find the odd one out in each group. Type the word that doesn't belong.\n\n1. piano, guitar, drum, paintbrush\n2. eagle, robin, salmon, sparrow\n3. Paris, Berlin, Tokyo, Amazon\n4. oxygen, nitrogen, gold, helium\n5. rose, tulip, oak, sunflower\n6. January, April, Tuesday, July\n7. tennis, chess, soccer, basketball\n8. hammer, saw, wrench, carrot\n\nType 8 answers, one per line.`,
  },

  // ─── PROCESSING SPEED (3) ─────────────────────────────────────────────────
  {
    id: 'ps-rapid-categorization',
    type: 'rapid_categorization',
    domain: 'processing_speed',
    name: 'Rapid Categorization',
    description: 'Categorize items as quickly as possible',
    difficulty: 2,
    durationSeconds: 60,
    parameters: { itemCount: 12, categories: ['animal', 'object'] },
    scoringRubric: `12 items timed. rawScore = correct answers. normalizedScore = (rawScore / 12) * 100.
Return JSON: {"rawScore": <0-12>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Speed round — I say a word, you call it: animal or object? As fast as you can.",
      "Speed challenge: animal or object? One word at a time, quick fire.",
      "Processing speed game — each word is either animal or object. Call it out fast.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Rapid Categorization:
Read words quickly one at a time: hammer(object), dolphin(animal), scissors(object), eagle(animal), chair(object), tiger(animal), lamp(object), frog(animal), clock(object), wolf(animal), bottle(object), parrot(animal).
Count correct responses.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-12>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `For each word, type 'animal' or 'object' as quickly as you can.\n\n1. hammer   2. dolphin   3. scissors   4. eagle   5. chair   6. tiger\n7. lamp     8. frog      9. clock     10. wolf   11. bottle 12. parrot\n\nType 12 answers separated by commas.`,
  },
  {
    id: 'ps-number-sequence',
    type: 'number_sequence',
    domain: 'processing_speed',
    name: 'Sequence Counting',
    description: 'Count specific items in a rapidly presented sequence',
    difficulty: 2,
    durationSeconds: 60,
    parameters: { sequenceLength: 20, targetItem: 'even numbers' },
    scoringRubric: `Correct count = 10. rawScore = 1 if exact, 0.5 if off by 1, 0 otherwise. normalizedScore = rawScore * 100.
Return JSON: {"rawScore": <0-1>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Quick counting challenge — I'll read numbers and you count how many even ones you hear.",
      "Listen carefully as I read a sequence of numbers — count only the even ones.",
      "Counting game: I'll say 20 numbers, you track the even ones only.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Sequence Counting:
Read at brisk pace: 3,8,1,4,7,2,9,6,5,8,3,4,11,6,7,2,9,4,1,8.
Correct count of evens: 10. Score per rubric.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-1>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Count the EVEN numbers in this sequence:\n\n3, 8, 1, 4, 7, 2, 9, 6, 5, 8, 3, 4, 11, 6, 7, 2, 9, 4, 1, 8\n\nType your count as a single number.`,
  },
  {
    id: 'ps-letter-search',
    type: 'letter_search',
    domain: 'processing_speed',
    name: 'Letter Scan',
    description: 'Count occurrences of a target letter in a spoken sequence',
    difficulty: 2,
    durationSeconds: 45,
    parameters: { sequenceLength: 15, targetLetter: 'S' },
    scoringRubric: `Correct count = 6. rawScore = 1 if exact, 0.5 if off by 1, 0 otherwise. normalizedScore = rawScore * 100.
Return JSON: {"rawScore": <0-1>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Letter tracking — I'll read 15 letters and you count how many times you hear the letter S.",
      "Quick scan: count the S's in this letter sequence.",
      "Count the S's as I read a sequence.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Letter Scan:
Read letters one at a time: B,S,T,S,M,K,S,L,S,P,R,S,N,S,Q.
Target: S. Correct count: 6 (positions 2,4,7,9,12,14). Score per rubric.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-1>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Count how many times the letter S appears in this sequence:\n\nB  S  T  S  M  K  S  L  S  P  R  S  N  S  Q\n\nType your count as a single number.`,
  },

  // ─── EXECUTIVE FUNCTION (3) ───────────────────────────────────────────────
  {
    id: 'ef-category-switching',
    type: 'category_switching',
    domain: 'executive_function',
    name: 'Category Switching',
    description: 'Alternate between naming items from two categories',
    difficulty: 3,
    durationSeconds: 90,
    parameters: { categories: ['fruits', 'countries'], rounds: 10 },
    scoringRubric: `10 alternations. rawScore = correct on-category responses. normalizedScore = (rawScore / 10) * 100.
Return JSON: {"rawScore": <0-10>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Let's try a switching task — alternate naming a fruit, then a country, then a fruit, and so on.",
      "Mental flexibility game — alternate between fruits and countries.",
      "Task-switching: fruit, country, fruit, country. 10 turns, let's go.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Category Switching:
Ask user to alternate naming fruits and countries for 10 turns (5 of each). Count correct on-category responses. Penalize wrong category or repeats.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-10>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Alternate naming a fruit and a country, starting with a fruit. No repeats. Continue for 10 turns (5 fruits, 5 countries).\n\nType your sequence separated by commas.\nExample: apple, France, mango, Brazil, ...`,
  },
  {
    id: 'ef-tower-verbal',
    type: 'tower_verbal',
    domain: 'executive_function',
    name: 'Tower Planning (Verbal)',
    description: 'Plan optimal moves to solve a Tower of Hanoi variant verbally',
    difficulty: 4,
    durationSeconds: 120,
    parameters: { diskCount: 3 },
    scoringRubric: `3-disk optimal = 7 moves. rawScore: ≤7→7, 8-10→5, 11-15→3, >15→1, gave up→0.
normalizedScore = (rawScore / 7) * 100.
Return JSON: {"rawScore": <0-7>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "There's a classic logic puzzle called Tower of Hanoi. Three pegs, three disks — move them all from peg A to peg C without putting a larger disk on a smaller one.",
      "Planning challenge: imagine 3 disks on peg A (large bottom, small top). Move all to peg C.",
      "Tower of Hanoi with 3 disks — describe your moves one at a time.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Tower of Hanoi (3 disks):
Rules: 3 pegs A/B/C. 3 disks (3=large, 1=small) stacked on A. Move all to C, never place larger on smaller. Optimal: 7 moves. Guide moves, confirm legality, count total.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-7>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Tower of Hanoi (3 disks, 3 pegs):\n\n- Pegs: A (start), B (middle), C (goal)\n- Disks: Large (3), Medium (2), Small (1) — all stacked on peg A, largest at bottom\n- Rules: Move one disk at a time. Never place a larger disk on a smaller one.\n- Goal: Move all disks from A to C.\n\nDescribe your moves as "Move disk [size] from [peg] to [peg]", one per line.\nOptimal solution uses 7 moves.`,
  },
  {
    id: 'ef-verbal-inhibition',
    type: 'verbal_inhibition',
    domain: 'executive_function',
    name: 'Say the Opposite',
    description: 'Quickly say the opposite of each word presented',
    difficulty: 2,
    durationSeconds: 60,
    parameters: { itemCount: 10 },
    scoringRubric: `10 items. rawScore = correct opposites. normalizedScore = (rawScore / 10) * 100.
Return JSON: {"rawScore": <0-10>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Quick inhibition game — I say a word, you immediately say its opposite.",
      "Say the opposite! I'll go through 10 words.",
      "Opposite word challenge — the trick is to override what your brain wants to say.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Say the Opposite:
Say words one at a time: hot, fast, dark, heavy, loud, happy, tall, rough, open, early.
Expected: cold, slow, light/bright, light, quiet, sad/unhappy, short, smooth, closed, late. Accept synonyms.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-10>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Type the OPPOSITE of each word:\n\n1. hot    2. fast   3. dark   4. heavy   5. loud\n6. happy  7. tall   8. rough  9. open   10. early\n\nType 10 answers, one per line or comma-separated.`,
  },

  // ─── LANGUAGE (3) ─────────────────────────────────────────────────────────
  {
    id: 'lang-category-fluency',
    type: 'category_fluency',
    domain: 'language',
    name: 'Category Verbal Fluency',
    description: 'Name as many items in a category as possible in 60 seconds',
    difficulty: 2,
    durationSeconds: 75,
    parameters: { category: 'animals', timeLimitSeconds: 60 },
    scoringRubric: `rawScore = unique valid animals. normalizedScore = min(100, (rawScore / 18) * 100).
Return JSON: {"rawScore": <number>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Quick verbal fluency check — name as many animals as you can in 60 seconds. Go!",
      "Fluency game: one minute to name as many animals as possible. Ready?",
      "Let's see your animal vocabulary — 60 seconds, name as many as you can.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Category Fluency (Animals):
Give user 60 seconds to name animals. Count unique valid ones. Disqualify repetitions.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <number>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Name as many different ANIMALS as you can think of.\n\nType them all separated by commas. No repeats. Aim for at least 12.`,
  },
  {
    id: 'lang-letter-fluency',
    type: 'letter_fluency',
    domain: 'language',
    name: 'Letter Verbal Fluency (F)',
    description: 'Name as many words starting with F as possible in 60 seconds',
    difficulty: 3,
    durationSeconds: 75,
    parameters: { letter: 'F', timeLimitSeconds: 60 },
    scoringRubric: `rawScore = unique valid words starting with F (no proper nouns). normalizedScore = min(100, (rawScore / 15) * 100).
Return JSON: {"rawScore": <number>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Letter fluency challenge — words starting with F, 60 seconds, any word but no names or numbers.",
      "Classic neuropsychology task: words starting with F. How many in a minute?",
      "The letter is F. 60 seconds — say any word starting with F.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Letter Fluency (F):
User names words starting with F for 60 seconds. No proper nouns or numbers. Count unique valid words.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <number>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Name as many words as you can that START WITH THE LETTER F.\n\nRules: no proper nouns (no names or places), no numbers. Type them all separated by commas. Aim for at least 10.`,
  },
  {
    id: 'lang-sentence-completion',
    type: 'sentence_completion',
    domain: 'language',
    name: 'Sentence Completion',
    description: 'Complete sentences with the most appropriate word or phrase',
    difficulty: 2,
    durationSeconds: 90,
    parameters: { itemCount: 8 },
    scoringRubric: `8 items. rawScore = grammatically/semantically appropriate completions. normalizedScore = (rawScore / 8) * 100.
Return JSON: {"rawScore": <0-8>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Language completion game — I'll read the start of a sentence and you finish it naturally.",
      "Quick sentence game: I start, you complete. No single right answer.",
      "I'll say the first half of a sentence, you complete it.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Sentence Completion:
Present stems one at a time: 1."Every morning she woke up and..." 2."The doctor told him that..." 3."Before leaving the house, he always..." 4."The most important thing in life is..." 5."Despite the rain, they decided to..." 6."She couldn't remember where she had put..." 7."The old map showed a path that led to..." 8."After many years, they finally..."
Score 1 per reasonable grammatically/semantically coherent completion.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-8>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Complete each sentence starter naturally and grammatically.\n\n1. Every morning she woke up and ___\n2. The doctor told him that ___\n3. Before leaving the house, he always ___\n4. The most important thing in life is ___\n5. Despite the rain, they decided to ___\n6. She couldn't remember where she had put ___\n7. The old map showed a path that led to ___\n8. After many years, they finally ___\n\nWrite one completion per sentence (one per line).`,
  },

  // ─── VISUOSPATIAL (3) ─────────────────────────────────────────────────────
  {
    id: 'vs-mental-rotation-verbal',
    type: 'mental_rotation_verbal',
    domain: 'visuospatial',
    name: 'Mental Rotation (Verbal)',
    description: 'Determine orientation of shapes through verbal description',
    difficulty: 3,
    durationSeconds: 90,
    parameters: { itemCount: 5 },
    scoringRubric: `5 items. rawScore = correct orientations. normalizedScore = (rawScore / 5) * 100.
Return JSON: {"rawScore": <0-5>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Spatial reasoning puzzle — I'll describe a shape and you tell me where it points after rotation.",
      "Mental rotation challenge: imagine shapes in your mind as I describe them.",
      "Spatial puzzle time — picture this as I describe it.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Mental Rotation (Verbal):
5 puzzles: 1.L-shape pointing right, rotate 90° clockwise → downward. 2.T-shape facing up, flip upside down → down. 3.Arrow pointing left, rotate 180° → right. 4.Letter P, mirror horizontally → resembles q. 5.Triangle tip pointing up, rotate 90° clockwise → right.
Score correct spatial reasoning. Accept paraphrasing.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-5>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Describe where each shape points after the transformation:\n\n1. An L-shape pointing RIGHT is rotated 90° clockwise — where does it point?\n2. A T-shape facing UP is flipped upside down — where does it face?\n3. An arrow pointing LEFT is rotated 180° — which direction does it point?\n4. The letter P is mirrored horizontally — what letter does it resemble?\n5. A triangle with its tip pointing UP is rotated 90° clockwise — which direction does the tip point?\n\nType your 5 answers, one per line.`,
  },
  {
    id: 'vs-direction-following',
    type: 'direction_following',
    domain: 'visuospatial',
    name: 'Verbal Map Navigation',
    description: 'Follow verbal directions on an imagined grid',
    difficulty: 3,
    durationSeconds: 90,
    parameters: { steps: 6 },
    scoringRubric: `6 directions then ask final position. rawScore = 1 if correct, 0 otherwise. normalizedScore = rawScore * 100.
Return JSON: {"rawScore": <0-1>, "normalizedScore": <0-100>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Imagine you're at the center of a grid. I'll give six directions — tell me where you end up.",
      "Navigation challenge: visualize a map and follow my directions.",
      "Mental GPS exercise — start at center, follow steps, tell me final position.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Verbal Map Navigation:
Start at (0,0). Directions: 1.North 3 → (0,3). 2.East 2 → (2,3). 3.South 1 → (2,2). 4.West 4 → (-2,2). 5.North 2 → (-2,4). 6.East 3 → (1,4).
Ask final position. Answer: 1 east, 4 north of center.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-1>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Start at position (0, 0) — the center of a grid. Follow these six moves:\n\n1. Move North 3 steps\n2. Move East 2 steps\n3. Move South 1 step\n4. Move West 4 steps\n5. Move North 2 steps\n6. Move East 3 steps\n\nWhere are you now? Describe your final position relative to the center (e.g., "2 east, 1 north").`,
  },
  {
    id: 'vs-pattern-description',
    type: 'pattern_description',
    domain: 'visuospatial',
    name: 'Pattern Recall',
    description: 'Recall a spatial pattern after a brief verbal description',
    difficulty: 2,
    durationSeconds: 90,
    parameters: { gridSize: '3x3', filledCells: 5 },
    scoringRubric: `5 cells in 3x3 grid. rawScore = correctly recalled cells. normalizedScore = (rawScore / 5) * 100.
Return JSON: {"rawScore": <0-5>, "normalizedScore": <number>, "feedback": "<encouraging sentence>"}`,
    conversationalBridges: [
      "Spatial memory test — I'll describe a 3x3 grid pattern, then ask you to recall it.",
      "Grid memory game: imagine a tic-tac-toe board. I'll tell you which squares are filled.",
      "Pattern visualization — I'll describe which squares are filled, then ask you to recall them.",
    ],
    systemPromptFragment: `EXERCISE ACTIVE — Pattern Recall:
Describe: "top-left filled, top-right filled, center filled, bottom-left filled, bottom-right filled" (X pattern: corners + center).
After a pause, ask which squares were filled. Score 1 per correctly recalled cell.
Output EXACTLY on its own line: EXERCISE_SCORE: {"rawScore": <0-5>, "normalizedScore": <0-100>, "feedback": "<1 encouraging sentence>"}`,
    standalonePrompt: `Memorize this 3×3 grid pattern (■ = filled, □ = empty):\n\n■ □ ■\n□ ■ □\n■ □ ■\n\nFilled squares: top-left, top-right, center, bottom-left, bottom-right.\n\nNow, without looking back — type the positions of the 5 filled squares.`,
  },
];

export function getExercisesByDomain(domain: CognitiveDomain): ExerciseDefinition[] {
  return EXERCISES.filter(e => e.domain === domain);
}

export function getExerciseById(id: string): ExerciseDefinition | undefined {
  return EXERCISES.find(e => e.id === id);
}
