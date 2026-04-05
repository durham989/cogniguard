import { pgTable, uuid, varchar, timestamp, integer, real, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const cognitiveDomainEnum = pgEnum('cognitive_domain', [
  'memory', 'attention', 'processing_speed', 'executive_function', 'language', 'visuospatial',
]);

export const exerciseSessions = pgTable('exercise_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  conversationId: uuid('conversation_id'),
  exerciseId: varchar('exercise_id', { length: 100 }).notNull(),
  domain: cognitiveDomainEnum('domain').notNull(),
  difficulty: integer('difficulty').notNull().default(2),
  rawScore: real('raw_score'),
  normalizedScore: real('normalized_score'),
  userResponse: varchar('user_response', { length: 8000 }),
  durationSeconds: integer('duration_seconds'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  metadata: jsonb('metadata'),
});
