import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { db as defaultDb } from './db/index';
import type { DB } from './db/index';
import { createAuthRouter } from './routes/auth';
import { createUsersRouter } from './routes/users';

export function createApp(db: DB = defaultDb) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'user-service' });
  });

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/users', createUsersRouter(db));

  return app;
}

if (require.main === module) {
  const port = process.env.USER_SERVICE_PORT ?? 3001;
  createApp().listen(port, () => console.log(`user-service listening on port ${port}`));
}
