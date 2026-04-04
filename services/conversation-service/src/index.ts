import 'dotenv/config';
import express from 'express';
import { db as defaultDb } from './db/index';
import type { DB } from './db/index';
import { createClaudeClient } from './services/claude.service';
import type { ClaudeClient } from './services/claude.service';
import { createConversationsRouter } from './routes/conversations';

export interface AppDeps {
  db: DB;
  claude: ClaudeClient;
}

export function createApp(deps?: Partial<AppDeps>) {
  const app = express();
  app.use(express.json());

  const db = deps?.db ?? defaultDb;
  const claude = deps?.claude ?? createClaudeClient();

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'conversation-service' });
  });

  app.use('/conversations', createConversationsRouter({ db, claude }));

  return app;
}

if (require.main === module) {
  const port = process.env.CONVERSATION_SERVICE_PORT ?? 3002;
  createApp().listen(port, () => console.log(`conversation-service listening on port ${port}`));
}
