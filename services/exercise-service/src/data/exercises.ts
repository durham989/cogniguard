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
    id: 'ef-dual-task-inhibition',
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
Tell this scenario: "Sarah has spent months preparing for her violin recital. The night before, she learns the venue has double-booked the date and the recital is cancelled. When she calls her mother to tell her, Sarah's voice is steady but she keeps pausing mid-sentence."
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
    id: 'ef-analogical',
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
  // ── TYPED INPUT EXERCISES ────────────────────────────────────────────────

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
  // ── EXPANDED SCIENCE-BACKED EXERCISES ───────────────────────────────────────
  // Based on: MMSE, MoCA, CANTAB, WAIS-IV, ACTIVE trial, Baddeley WM model,
  // Eriksen Flanker, Cambridge PAL, WMS-IV paired associates.

  // ── MEMORY ─────────────────────────────────────────────────────────────────

  {
    id: 'mem-paired-associates',
    type: 'paired_associates',
    domain: 'memory',
    name: 'Object–Color Pairs',
    description: 'Study object–color pairs, then recall which color matched each object',
    difficulty: 3,
    durationSeconds: 60,
    parameters: {},
    inputType: 'word-bank' as const,
    wordBankData: {
      sentence: 'Book pairs with ____. Key pairs with ____. Hat pairs with ____.',
      answers: ['Red', 'Blue', 'Green'],
      bankWords: ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange'],
    },
    scoringRubric: '',
    conversationalBridges: [
      "Here's a classic memory pairing task — study the object–color pairs, then recall them.",
      "Paired associates learning is one of the earliest signs of memory change — let's practice it.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Paired Associates: Tell the user: 'Study these pairs: Book=Red, Key=Blue, Hat=Green.' After 10 seconds, ask them to recall which color goes with each object. Score 1 per correct pair. normalizedScore = (correct/3)*100.",
    standalonePrompt: 'Study these pairs carefully:\n\nBook → Red\nKey → Blue\nHat → Green\n\nNow fill in the colors from memory:',
  },

  {
    id: 'mem-name-occupation',
    type: 'name_occupation_recall',
    domain: 'memory',
    name: 'Name–Job Recall',
    description: 'Remember who does what, then answer a question — tests face-name associative memory',
    difficulty: 2,
    durationSeconds: 45,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'Doctor', isCorrect: false },
      { id: 'b', text: 'Engineer', isCorrect: true },
      { id: 'c', text: 'Teacher', isCorrect: false },
      { id: 'd', text: 'Lawyer', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Name–job memory is an early marker for episodic memory health — let's practice it.",
      "Here's a quick who-does-what memory challenge.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Name-Job: Tell user 'Maria is a doctor. Tom is an engineer. Sara is a teacher.' Then ask 'What is Tom's job?' Answer: Engineer. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Read these carefully:\n\nMaria is a doctor.\nTom is an engineer.\nSara is a teacher.\n\nWhat is Tom\'s job?',
  },

  {
    id: 'mem-grocery-sequence',
    type: 'word_list_recall',
    domain: 'memory',
    name: 'Grocery List Order',
    description: 'Memorize a shopping list in exact order — tests ordered episodic memory',
    difficulty: 3,
    durationSeconds: 75,
    parameters: {},
    inputType: 'sequence-recall' as const,
    sequenceItems: ['Milk', 'Eggs', 'Bread', 'Apples', 'Butter'],
    sequenceDisplayMs: 5000,
    scoringRubric: '',
    conversationalBridges: [
      "Everyday memory challenge — memorize a grocery list in the exact order given.",
      "Prospective list memory is a real-world skill we train here — ready to memorize a shopping list?",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Grocery List: Show in order: Milk, Eggs, Bread, Apples, Butter. Ask user to recall in exact order. 1 point per item in correct position. normalizedScore = (correct/5)*100.",
    standalonePrompt: '',
  },

  {
    id: 'mem-event-timeline',
    type: 'prospective_event',
    domain: 'memory',
    name: 'Day Timeline',
    description: 'Recall what happened at a specific time in a sequence of daily events',
    difficulty: 2,
    durationSeconds: 40,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'Had breakfast', isCorrect: false },
      { id: 'b', text: 'Called a friend', isCorrect: true },
      { id: 'c', text: 'Went for a walk', isCorrect: false },
      { id: 'd', text: 'Read a book', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Temporal order memory — remembering the sequence of daily events — is tested here.",
      "Let's practice episodic timeline recall, a skill that predicts memory health.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Day Timeline: 'She rose at 7am, called a friend at 9am, went for a walk at 11am, and read a book at 3pm.' Ask: 'What did she do at 9am?' Answer: Called a friend. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Read this daily schedule:\n\n7:00 AM — Rose and had breakfast\n9:00 AM — Called a friend\n11:00 AM — Went for a walk\n3:00 PM — Read a book\n\nWhat did she do at 9:00 AM?',
  },

  // ── ATTENTION ──────────────────────────────────────────────────────────────

  {
    id: 'attn-serial-sevens',
    type: 'serial_subtraction',
    domain: 'attention',
    name: 'Serial 7s',
    description: 'Count backward from 100 by sevens — a gold-standard MMSE attention test',
    difficulty: 3,
    durationSeconds: 40,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: '58', isCorrect: false },
      { id: 'b', text: '65', isCorrect: true },
      { id: 'c', text: '63', isCorrect: false },
      { id: 'd', text: '72', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Serial 7s — subtracting 7 from 100 repeatedly — is one of the oldest attention measures in clinical use.",
      "Here's the classic MMSE serial subtraction task. Start at 100 and go.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Serial 7s: Ask 'Start at 100 and subtract 7 five times. What is the result?' 100→93→86→79→72→65. Answer: 65. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Start at 100 and subtract 7, five times in a row.\n\n100 → ? → ? → ? → ? → ?\n\nWhat is the final number?',
  },

  {
    id: 'attn-flanker',
    type: 'flanker_task',
    domain: 'attention',
    name: 'Arrow Flanker',
    description: 'Identify the direction of the center arrow while ignoring flankers — Eriksen Flanker Task',
    difficulty: 2,
    durationSeconds: 20,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'Left (←)', isCorrect: false },
      { id: 'b', text: 'Right (→)', isCorrect: true },
      { id: 'c', text: 'Up (↑)', isCorrect: false },
      { id: 'd', text: 'Down (↓)', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "The Eriksen Flanker Task tests selective attention — focus on the middle arrow only.",
      "This one tests your ability to focus on what matters and ignore distractions.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Flanker: 'In the sequence ← ← → ← ←, which direction does the CENTER arrow point?' Answer: Right. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Focus only on the CENTER arrow.\n\n← ← → ← ←\n\nWhich direction does the center arrow point?',
  },

  {
    id: 'attn-letter-count',
    type: 'letter_search',
    domain: 'attention',
    name: 'Letter Count',
    description: 'Count how many times a target letter appears — visual cancellation task from MoCA',
    difficulty: 2,
    durationSeconds: 30,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: '3', isCorrect: false },
      { id: 'b', text: '4', isCorrect: true },
      { id: 'c', text: '5', isCorrect: false },
      { id: 'd', text: '6', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Visual cancellation — counting a target letter — is a classic sustained attention measure.",
      "Quick visual attention test: count only the A's.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Letter Count: Ask 'How many A's appear in: F A B A T E R A Q A?' Answer: 4 (positions 2,4,8,10). Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Count how many times the letter A appears:\n\nF A B A T E R A Q A\n\nHow many A\'s are there?',
  },

  {
    id: 'attn-divided-numbers',
    type: 'rapid_categorization',
    domain: 'attention',
    name: 'Odd or Even Sort',
    description: 'Rapidly classify numbers as odd or even — divided attention and processing speed',
    difficulty: 1,
    durationSeconds: 25,
    parameters: {},
    inputType: 'sequence-recall' as const,
    sequenceItems: ['Odd', 'Even', 'Odd', 'Even', 'Even'],
    sequenceDisplayMs: 6000,
    scoringRubric: '',
    conversationalBridges: [
      "Quick classification task — odd or even? Answer in the order shown.",
      "Let's warm up divided attention with a rapid odd/even sort.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Odd/Even: Show numbers 7, 4, 13, 8, 22 one at a time. Ask user to recall whether each was odd or even, in order. Correct: Odd, Even, Odd, Even, Even. 1 point per position. normalizedScore = (correct/5)*100.",
    standalonePrompt: 'Study each number and remember if it is Odd or Even:\n\n7 → 4 → 13 → 8 → 22\n\nNow recall: was each number Odd or Even? (tap in the same order)',
  },

  // ── PROCESSING SPEED ───────────────────────────────────────────────────────

  {
    id: 'ps-mental-arithmetic',
    type: 'mental_arithmetic',
    domain: 'processing_speed',
    name: 'Quick Calculation',
    description: 'Solve a multi-step mental arithmetic problem quickly — tests processing speed and working memory',
    difficulty: 2,
    durationSeconds: 30,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: '38', isCorrect: false },
      { id: 'b', text: '40', isCorrect: true },
      { id: 'c', text: '42', isCorrect: false },
      { id: 'd', text: '36', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Mental arithmetic under time pressure exercises both processing speed and working memory.",
      "Quick math — no pen and paper, just your brain.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Mental Arithmetic: Ask '15 + 28 − 6 + 3 = ?' Answer: 40. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Solve mentally — no writing:\n\n15 + 28 − 6 + 3 = ?',
  },

  {
    id: 'ps-fraction-comparison',
    type: 'fraction_comparison',
    domain: 'processing_speed',
    name: 'Fraction Race',
    description: 'Quickly decide which fraction is larger — numerical reasoning under speed pressure',
    difficulty: 2,
    durationSeconds: 20,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: '3/4 (= 0.75)', isCorrect: false },
      { id: 'b', text: '4/5 (= 0.80)', isCorrect: true },
      { id: 'c', text: 'They are equal', isCorrect: false },
      { id: 'd', text: 'Cannot be determined', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Quick fraction judgment — speed and accuracy both matter here.",
      "Which is bigger? Think fast.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Fraction Comparison: Ask 'Which is larger: 3/4 or 4/5?' Answer: 4/5 (0.80 > 0.75). Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Which fraction is larger?\n\n3/4   or   4/5',
  },

  {
    id: 'ps-change-calculation',
    type: 'mental_arithmetic',
    domain: 'processing_speed',
    name: 'Making Change',
    description: 'Calculate exact change from a purchase — everyday numeracy and speed',
    difficulty: 1,
    durationSeconds: 25,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: '$1.50', isCorrect: false },
      { id: 'b', text: '$2.00', isCorrect: true },
      { id: 'c', text: '$1.75', isCorrect: false },
      { id: 'd', text: '$2.25', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Everyday math is a great processing speed exercise — how much change do you get?",
      "Quick mental arithmetic from real life.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Change: 'Apples cost $0.75 each. You buy 4 and pay $5. How much change?' 4×$0.75=$3.00; $5−$3=$2.00. Answer: $2.00. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Apples cost $0.75 each.\nYou buy 4 apples and pay with a $5 bill.\n\nHow much change do you receive?',
  },

  // ── EXECUTIVE FUNCTION ─────────────────────────────────────────────────────

  {
    id: 'ef-syllogism',
    type: 'syllogism',
    domain: 'executive_function',
    name: 'Logical Deduction',
    description: 'Determine whether a conclusion follows logically — deductive reasoning from WAIS-IV',
    difficulty: 3,
    durationSeconds: 35,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'Yes — the conclusion follows logically', isCorrect: true },
      { id: 'b', text: 'No — the conclusion does not follow', isCorrect: false },
      { id: 'c', text: 'It depends on the situation', isCorrect: false },
      { id: 'd', text: 'The premises are contradictory', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Logical deduction exercises the prefrontal cortex — a region targeted in dementia prevention.",
      "Syllogisms test your ability to reason from premises to conclusions.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Syllogism: 'All birds have wings. Penguins are birds. Do penguins have wings?' Answer: Yes — logically follows even though penguins can't fly. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Premises:\n1. All birds have wings.\n2. Penguins are birds.\n\nConclusion: Penguins have wings.\n\nDoes this conclusion follow logically from the premises?',
  },

  {
    id: 'ef-similarities',
    type: 'similarities',
    domain: 'executive_function',
    name: 'What\'s in Common?',
    description: 'Identify the most abstract shared category — WAIS-IV Similarities subtest',
    difficulty: 2,
    durationSeconds: 30,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'Both are yellow', isCorrect: false },
      { id: 'b', text: 'Both are grown on trees', isCorrect: false },
      { id: 'c', text: 'Both are fruits', isCorrect: true },
      { id: 'd', text: 'Both taste sweet', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "The Similarities task from the WAIS tests abstract categorical reasoning — a key executive skill.",
      "What do these two things have in common at the deepest level?",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Similarities: Ask 'How are apple and banana most alike?' Best answer: Both are fruits (abstract category, not perceptual features). Score 100 correct, 0 incorrect.",
    standalonePrompt: 'How are an apple and a banana most alike?\n\nChoose the BEST answer:',
  },

  {
    id: 'ef-best-route',
    type: 'planning',
    domain: 'executive_function',
    name: 'Errand Planning',
    description: 'Choose the most efficient order to complete multiple errands — Tower of London proxy',
    difficulty: 3,
    durationSeconds: 45,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'Bank → Post office → Pharmacy → Grocery', isCorrect: false },
      { id: 'b', text: 'Grocery → Bank → Post office → Pharmacy', isCorrect: false },
      { id: 'c', text: 'Bank → Pharmacy → Post office → Grocery', isCorrect: false },
      { id: 'd', text: 'Post office → Bank → Pharmacy → Grocery', isCorrect: true },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Errand planning exercises the prefrontal planning circuits that are vulnerable in early dementia.",
      "Efficient sequencing is a key executive function — let's practice planning a route.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Errand Planning: 'The post office closes at noon (it's 11:45am). Bank closes at 3pm. Pharmacy and grocery are open all day. You need all four.' Best order: Post office first (closes soon), then Bank, Pharmacy, Grocery. Answer: Post office → Bank → Pharmacy → Grocery. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'It is 11:45 AM. You need to visit four places:\n\n• Post office — closes at 12:00 PM\n• Bank — closes at 3:00 PM\n• Pharmacy — open all day\n• Grocery store — open all day\n\nWhat is the most efficient order to visit them?',
  },

  {
    id: 'ef-colour-word-inhibition',
    type: 'verbal_inhibition',
    domain: 'executive_function',
    name: 'Inhibit the Word',
    description: 'Say the number of words in each line, not what the words say — requires response inhibition',
    difficulty: 3,
    durationSeconds: 30,
    parameters: {},
    inputType: 'sequence-recall' as const,
    sequenceItems: ['3', '2', '4', '1'],
    sequenceDisplayMs: 7000,
    scoringRubric: '',
    conversationalBridges: [
      "This inhibition task asks you to override the automatic reading response — a key executive skill.",
      "Don't read the words — count them. Harder than it sounds.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Word Inhibition: Show lines one at a time. Ask user to state the NUMBER OF WORDS in each line (not read them). Line 1: 'cat dog bird' (3). Line 2: 'sun moon' (2). Line 3: 'red blue green yellow' (4). Line 4: 'apple' (1). Score 1 per correct count. normalizedScore = (correct/4)*100.",
    standalonePrompt: 'Count the NUMBER of words in each line — do not read the words aloud:\n\nLine 1:  cat  dog  bird\nLine 2:  sun  moon\nLine 3:  red  blue  green  yellow\nLine 4:  apple\n\nTap the correct count for each line, in order:',
  },

  // ── LANGUAGE ───────────────────────────────────────────────────────────────

  {
    id: 'lang-synonym',
    type: 'synonym_selection',
    domain: 'language',
    name: 'Find the Synonym',
    description: 'Select the word closest in meaning — vocabulary depth is a strong predictor of cognitive reserve',
    difficulty: 2,
    durationSeconds: 25,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'Strict', isCorrect: false },
      { id: 'b', text: 'Generous', isCorrect: true },
      { id: 'c', text: 'Clever', isCorrect: false },
      { id: 'd', text: 'Timid', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Vocabulary size is one of the strongest predictors of cognitive reserve — let's keep it sharp.",
      "Word knowledge — what's a synonym for BENEVOLENT?",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Synonym: Ask 'Which word is closest in meaning to BENEVOLENT?' Answer: Generous. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Which word is closest in meaning to:\n\nBENEVOLENT',
  },

  {
    id: 'lang-word-definition',
    type: 'definition_matching',
    domain: 'language',
    name: 'Word Definition',
    description: 'Match a word to its correct definition — tests crystallized intelligence linked to dementia resilience',
    difficulty: 3,
    durationSeconds: 25,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'Ancient or long-lasting', isCorrect: false },
      { id: 'b', text: 'Short-lived or transient', isCorrect: true },
      { id: 'c', text: 'Transparent or see-through', isCorrect: false },
      { id: 'd', text: 'Mysterious or puzzling', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Crystallized vocabulary knowledge is remarkably resilient in healthy aging — let's exercise it.",
      "What does EPHEMERAL mean? Word knowledge is brain health.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Definition: Ask 'What does EPHEMERAL mean?' Answer: Short-lived or transient. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'What does the word EPHEMERAL mean?',
  },

  {
    id: 'lang-rhyme-pair',
    type: 'phonological_awareness',
    domain: 'language',
    name: 'Rhyme Detection',
    description: 'Identify which pair of words rhymes — phonological processing is an early language health marker',
    difficulty: 1,
    durationSeconds: 20,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'cat / dog', isCorrect: false },
      { id: 'b', text: 'moon / spoon', isCorrect: true },
      { id: 'c', text: 'house / horse', isCorrect: false },
      { id: 'd', text: 'tree / train', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Phonological awareness — detecting sound patterns — is a foundation of language health.",
      "Which pair rhymes? Sound processing is a key cognitive skill.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Rhyme: Ask 'Which pair of words rhymes?' Options: cat/dog, moon/spoon, house/horse, tree/train. Answer: moon/spoon. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Which pair of words rhymes?',
  },

  {
    id: 'lang-cloze-science',
    type: 'sentence_completion',
    domain: 'language',
    name: 'Science Fill-In',
    description: 'Fill in blanks in a science sentence — semantic memory and language comprehension',
    difficulty: 2,
    durationSeconds: 40,
    parameters: {},
    inputType: 'word-bank' as const,
    wordBankData: {
      sentence: 'The Earth takes one ____ to orbit the Sun, and one ____ to rotate on its own axis.',
      answers: ['year', 'day'],
      bankWords: ['year', 'day', 'month', 'hour', 'century', 'decade'],
    },
    scoringRubric: '',
    conversationalBridges: [
      "Cloze procedure — filling sentence blanks — targets semantic memory and language processing.",
      "Fill in the science facts — these target long-term semantic memory.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Cloze Science: 'The Earth takes one ____ to orbit the Sun, and one ____ to rotate on its axis.' Answers: year, day. Score 1 per correct blank. normalizedScore = (correct/2)*100.",
    standalonePrompt: 'Fill in the blanks:',
  },

  // ── VISUOSPATIAL ───────────────────────────────────────────────────────────

  {
    id: 'vs-compass-rotation',
    type: 'compass_rotation',
    domain: 'visuospatial',
    name: 'Compass Turns',
    description: 'Track direction after a series of turns — spatial orientation from neuropsychological batteries',
    difficulty: 2,
    durationSeconds: 30,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: 'North', isCorrect: false },
      { id: 'b', text: 'South', isCorrect: false },
      { id: 'c', text: 'East', isCorrect: false },
      { id: 'd', text: 'West', isCorrect: true },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Spatial orientation tasks are used in navigation studies of hippocampal function — let's practice.",
      "Turn-by-turn direction tracking exercises your spatial working memory.",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Compass: 'Face North. Turn 90° clockwise (now East). Turn 180° (now West).' Ask which direction they face. Answer: West. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'You start facing North.\n\n1. Turn 90° clockwise.\n2. Then turn 180°.\n\nWhich direction are you now facing?',
  },

  {
    id: 'vs-clock-reading',
    type: 'clock_reading',
    domain: 'visuospatial',
    name: 'Clock Reading',
    description: 'Read a described clock face — the Clock Drawing Test is a gold-standard MoCA/MMSE task',
    difficulty: 1,
    durationSeconds: 20,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: '3:09', isCorrect: false },
      { id: 'b', text: '3:45', isCorrect: true },
      { id: 'c', text: '9:15', isCorrect: false },
      { id: 'd', text: '9:03', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "Clock reading is part of the MoCA and MMSE — a classic visuospatial and executive function test.",
      "Quick clock test — what time does this show?",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — Clock: 'Hour hand points to 3, minute hand points to 9.' Ask what time it shows. Answer: 3:45 (minute hand at 9 = 45 minutes). Score 100 correct, 0 incorrect.",
    standalonePrompt: 'A clock has:\n• Hour hand pointing to 3\n• Minute hand pointing to 9\n\nWhat time does the clock show?',
  },

  {
    id: 'vs-block-count',
    type: 'pattern_recognition',
    domain: 'visuospatial',
    name: '3D Block Count',
    description: 'Count cubes in a 3D arrangement described verbally — from MoCA visuospatial battery',
    difficulty: 3,
    durationSeconds: 35,
    parameters: {},
    inputType: 'multiple-choice' as const,
    options: [
      { id: 'a', text: '7', isCorrect: false },
      { id: 'b', text: '8', isCorrect: false },
      { id: 'c', text: '9', isCorrect: true },
      { id: 'd', text: '10', isCorrect: false },
    ],
    scoringRubric: '',
    conversationalBridges: [
      "3D block counting requires mental visualization — a visuospatial skill tied to parietal lobe health.",
      "Imagine this 3D shape — how many cubes does it take to build it?",
    ],
    systemPromptFragment:
      "EXERCISE ACTIVE — 3D Block Count: Describe '2 rows of 3 cubes on the bottom (6 cubes total), and 1 row of 3 cubes on top (3 cubes). Total = 9.' Ask user to count the cubes. Answer: 9. Score 100 correct, 0 incorrect.",
    standalonePrompt: 'Visualize this 3D structure:\n\n• Bottom layer: 2 rows of 3 cubes (6 cubes)\n• Top layer: 1 row of 3 cubes (3 cubes)\n\nHow many cubes are there in total?',
  },
];

export function getExercisesByDomain(domain: CognitiveDomain): ExerciseDefinition[] {
  return EXERCISES.filter(e => e.domain === domain);
}

export function getExerciseById(id: string): ExerciseDefinition | undefined {
  return EXERCISES.find(e => e.id === id);
}
