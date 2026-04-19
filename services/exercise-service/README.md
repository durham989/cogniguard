# Exercise Service

Manages exercise sessions, adaptive difficulty selection, and AI-powered scoring. Runs on port 3003.

## Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/exercises/next` | Get next exercise (adaptive selection) |
| GET | `/exercises/history` | Get completed exercise history |
| GET | `/exercises/stats` | Get streak, level, and domain badges |
| POST | `/exercises/:id/submit` | Submit a conversational exercise (pre-scored by conversation service) |
| POST | `/exercises/:id/score-standalone` | Submit and score a solo exercise via Claude |

## Exercise Library

24 exercises across 6 cognitive domains:

| Domain | Count | IDs |
|--------|-------|-----|
| Memory | 4 | `mem-word-recall`, `mem-story-retelling`, `mem-n-back`, `mem-prospective` |
| Attention | 4 | `att-digit-span`, `att-stroop`, `att-odd-one-out`, `att-dual-task-verbal` |
| Processing Speed | 3 | `ps-rapid-categorization`, `ps-number-sequence`, `ps-letter-search` |
| Executive Function | 5 | `ef-category-switching`, `ef-tower-verbal`, `ef-verbal-inhibition`, `ef-dual-task-inhibition`, `ef-analogical` |
| Language | 5 | `lang-category-fluency`, `lang-letter-fluency`, `lang-sentence-completion`, `lang-social-emotion`, `lang-social-tom` |
| Visuospatial | 3 | `vs-mental-rotation-verbal`, `vs-direction-following`, `vs-pattern-description` |

Exercises exist at difficulties 2–4. The adaptive algorithm targets difficulty based on recent performance per domain.

## Adaptive Selection Algorithm

1. Find the domain with the fewest completed sessions
2. Compute average score over the last 5 sessions in that domain
3. Adjust target difficulty: avg ≥ 75 → step up, avg < 45 → step down, otherwise hold
4. Pick the closest available exercise by difficulty, excluding the last completed exercise

## Scoring

Uses `claude-haiku-4-5-20251001`. Parses `EXERCISE_SCORE: {...}` JSON from the model response. Returns `rawScore` (0–100) and `normalizedScore` (0–100).

## Gamification

`GET /exercises/stats` returns:
- **Streak** — consecutive UTC days with ≥1 completed session
- **Level** — 1 (Beginner) → 7 (Legend) based on total completed sessions
- **Domain badges** — none / bronze / silver / gold / platinum per domain

## Development

```bash
pnpm dev         # Start with hot reload
pnpm test        # Run tests (26 passing, mocha/chai/sinon/supertest)
pnpm db:migrate  # Apply Drizzle migrations
pnpm build       # Compile TypeScript
```

Reads environment from `../../.env` (repo root). Requires `ANTHROPIC_API_KEY`.
