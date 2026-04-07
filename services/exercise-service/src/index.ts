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
