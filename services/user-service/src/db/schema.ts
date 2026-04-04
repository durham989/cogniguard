import {
  pgTable, uuid, varchar, text, timestamp, boolean, jsonb, pgEnum,
} from 'drizzle-orm/pg-core';

export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'premium']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  dob: varchar('dob', { length: 10 }),
  onboardingCompletedAt: timestamp('onboarding_completed_at'),
  subscriptionTier: subscriptionTierEnum('subscription_tier').notNull().default('free'),
  healthContext: jsonb('health_context').$type<{
    medications?: string[];
    familyHistory?: boolean;
    selfReportedConcerns?: string;
  }>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const cognitiveProfiles = pgTable('cognitive_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  baselineEstablishedAt: timestamp('baseline_established_at'),
  domains: jsonb('domains').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const consents = pgTable('consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  conversationalAI: boolean('conversational_ai').notNull().default(false),
  cognitiveTracking: boolean('cognitive_tracking').notNull().default(false),
  linguisticMonitoring: boolean('linguistic_monitoring').notNull().default(false),
  clinicalReports: boolean('clinical_reports').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
