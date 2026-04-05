import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const conversationStateEnum = pgEnum('conversation_state', [
  'GREETING', 'FREE_CHAT', 'EXERCISE_INTRO', 'EXERCISE_ACTIVE',
  'EXERCISE_DEBRIEF', 'REFLECTION', 'FAREWELL', 'SESSION_END',
]);

export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant', 'system']);

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  state: conversationStateEnum('state').notNull().default('GREETING'),
  name: varchar('name', { length: 100 }),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  tokens: integer('tokens'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
