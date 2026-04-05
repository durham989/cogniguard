import 'dotenv/config';
import express from 'express';
import { db as defaultDb } from './db/index';
import type { DB } from './db/index';
import { createExercisesRouter } from './routes/exercises';

export function createApp(db: DB = defaultDb) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'exercise-service' });
  });

  app.use('/exercises', createExercisesRouter({ db }));

  return app;
}

if (require.main === module) {
  const port = process.env.EXERCISE_SERVICE_PORT ?? 3003;
  createApp().listen(port, () => console.log(`exercise-service listening on port ${port}`));
}
