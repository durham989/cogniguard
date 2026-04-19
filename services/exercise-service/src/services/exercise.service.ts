import { eq, and, desc, isNotNull } from 'drizzle-orm';
import type { DB } from '../db/index';
import { exerciseSessions } from '../db/schema';
import { EXERCISES, getExerciseById } from '../data/exercises';
import type { ExerciseDefinition, ExerciseResult, CognitiveDomain } from '@cogniguard/types';
import type { ClaudeScorer } from './claude.service';

const LEVEL_THRESHOLDS = [
  { min: 500, level: 7, label: 'Legend' },
  { min: 200, level: 6, label: 'Master' },
  { min: 100, level: 5, label: 'Expert' },
  { min: 50, level: 4, label: 'Adept' },
  { min: 25, level: 3, label: 'Practitioner' },
  { min: 10, level: 2, label: 'Apprentice' },
  { min: 0, level: 1, label: 'Beginner' },
];

const BADGE_TIERS = [
  { tier: 'platinum', minSessions: 20, minAvg: 85 },
  { tier: 'gold', minSessions: 10, minAvg: 70 },
  { tier: 'silver', minSessions: 5, minAvg: 50 },
  { tier: 'bronze', minSessions: 1, minAvg: 0 },
] as const;

export type BadgeTier = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface UserStats {
  streak: number;
  level: number;
  levelLabel: string;
  nextLevelAt: number | null;
  domainBadges: Record<string, BadgeTier>;
}

export interface ExerciseServiceDeps {
  db: DB;
  scorer: ClaudeScorer;
}

export function createExerciseService(deps: ExerciseServiceDeps) {
  const { db, scorer } = deps;

  const DOMAIN_ORDER: CognitiveDomain[] = [
    'memory', 'attention', 'processing_speed', 'executive_function', 'language', 'visuospatial',
  ];

  async function getNextExercise(userId: string): Promise<{ exercise: ExerciseDefinition; sessionId: string }> {
    const completed = await db
      .select()
      .from(exerciseSessions)
      .where(and(eq(exerciseSessions.userId, userId), isNotNull(exerciseSessions.completedAt)));

    // ── Step 1: Find the domain with fewest completed sessions ────────────────
    const domainCounts: Record<string, number> = {};
    const domainLastDifficulty: Record<string, number> = {};
    const domainLastTs: Record<string, number> = {};
    let lastCompletedExerciseId: string | null = null;
    let lastCompletedAt = 0;

    for (const s of completed) {
      domainCounts[s.domain] = (domainCounts[s.domain] ?? 0) + 1;
      const ts = s.completedAt!.getTime();
      if (ts > lastCompletedAt) {
        lastCompletedAt = ts;
        lastCompletedExerciseId = s.exerciseId;
      }
      if (ts > (domainLastTs[s.domain] ?? 0)) {
        domainLastTs[s.domain] = ts;
        domainLastDifficulty[s.domain] = s.difficulty;
      }
    }

    // Sort domains by session count ascending, then by DOMAIN_ORDER for ties
    const targetDomain = DOMAIN_ORDER
      .map(d => ({ domain: d, count: domainCounts[d] ?? 0 }))
      .sort((a, b) => a.count - b.count)[0]!.domain;

    // ── Step 2: Compute recent avg for target domain ───────────────────────────
    const domainSessions = completed
      .filter(s => s.domain === targetDomain && s.normalizedScore !== null)
      .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())
      .slice(0, 5);

    const recentAvg = domainSessions.length > 0
      ? domainSessions.reduce((sum, s) => sum + (s.normalizedScore ?? 0), 0) / domainSessions.length
      : 50; // neutral default — no data means neutral difficulty

    // ── Step 3: Determine target difficulty ───────────────────────────────────
    const lastDifficulty = domainLastDifficulty[targetDomain] ?? 2;
    let targetDifficulty: number;
    if (recentAvg >= 75) {
      targetDifficulty = Math.min(5, lastDifficulty + 1);
    } else if (recentAvg < 45) {
      targetDifficulty = Math.max(1, lastDifficulty - 1);
    } else {
      targetDifficulty = lastDifficulty;
    }

    // ── Step 4: Select exercise ────────────────────────────────────────────────
    const candidates = EXERCISES.filter(e => e.domain === targetDomain);
    // Sort by distance from target difficulty, then by id for determinism
    candidates.sort((a, b) => {
      const da = Math.abs(a.difficulty - targetDifficulty);
      const db2 = Math.abs(b.difficulty - targetDifficulty);
      return da !== db2 ? da - db2 : a.id.localeCompare(b.id);
    });

    let exercise = candidates.find(e => e.id !== lastCompletedExerciseId);
    // Fallback: if all domain exercises were last played, pick any in domain
    if (!exercise) exercise = candidates[0];
    // Last-resort fallback: pick any exercise not last played
    if (!exercise) {
      exercise = EXERCISES.find(e => e.id !== lastCompletedExerciseId) ?? EXERCISES[0];
    }

    const [session] = await db.insert(exerciseSessions).values({
      userId,
      exerciseId: exercise.id,
      domain: exercise.domain as any,
      difficulty: exercise.difficulty,
    }).returning();

    return { exercise, sessionId: session.id };
  }

  /**
   * Submits a score for a completed exercise session.
   * The score is pre-computed by Claude in the conversation.
   */
  async function submitExercise(
    sessionId: string,
    requestingUserId: string,
    conversationId: string,
    userResponse: string,
    durationSeconds: number,
    scorePayload: { rawScore: number; normalizedScore: number; feedback: string },
  ): Promise<ExerciseResult> {
    const session = await db.query.exerciseSessions.findFirst({
      where: eq(exerciseSessions.id, sessionId),
    });

    if (!session) throw Object.assign(new Error('Exercise session not found'), { code: 'NOT_FOUND' });
    if (session.userId !== requestingUserId) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
    if (session.completedAt) throw Object.assign(new Error('Already submitted'), { code: 'ALREADY_SUBMITTED' });

    await db.update(exerciseSessions)
      .set({
        rawScore: scorePayload.rawScore,
        normalizedScore: scorePayload.normalizedScore,
        userResponse,
        durationSeconds,
        conversationId,
        completedAt: new Date(),
        metadata: { feedback: scorePayload.feedback },
      })
      .where(eq(exerciseSessions.id, sessionId));

    return {
      exerciseSessionId: sessionId,
      rawScore: scorePayload.rawScore,
      normalizedScore: scorePayload.normalizedScore,
      domain: session.domain as CognitiveDomain,
      feedback: scorePayload.feedback,
    };
  }

  async function scoreStandalone(
    sessionId: string,
    requestingUserId: string,
    userResponse: string,
    durationSeconds: number,
  ): Promise<ExerciseResult> {
    const session = await db.query.exerciseSessions.findFirst({
      where: eq(exerciseSessions.id, sessionId),
    });

    if (!session) throw Object.assign(new Error('Exercise session not found'), { code: 'NOT_FOUND' });
    if (session.userId !== requestingUserId) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
    if (session.completedAt) throw Object.assign(new Error('Already submitted'), { code: 'ALREADY_SUBMITTED' });

    const exercise = getExerciseById(session.exerciseId);
    if (!exercise) throw Object.assign(new Error('Exercise definition not found'), { code: 'NOT_FOUND' });

    const scored = await scorer.score(exercise.scoringRubric, userResponse);

    await db.update(exerciseSessions)
      .set({
        rawScore: scored.rawScore,
        normalizedScore: scored.normalizedScore,
        userResponse,
        durationSeconds,
        completedAt: new Date(),
        metadata: { feedback: scored.feedback },
      })
      .where(eq(exerciseSessions.id, sessionId));

    return {
      exerciseSessionId: sessionId,
      rawScore: scored.rawScore,
      normalizedScore: scored.normalizedScore,
      domain: session.domain as CognitiveDomain,
      feedback: scored.feedback,
    };
  }

  async function getHistory(userId: string) {
    return db
      .select()
      .from(exerciseSessions)
      .where(eq(exerciseSessions.userId, userId))
      .orderBy(desc(exerciseSessions.startedAt));
  }

  async function getStats(userId: string): Promise<UserStats> {
    const completed = await db
      .select()
      .from(exerciseSessions)
      .where(and(eq(exerciseSessions.userId, userId), isNotNull(exerciseSessions.completedAt)));

    // ── Level ────────────────────────────────────────────────────────────────
    const totalCompleted = completed.length;
    const levelEntry = LEVEL_THRESHOLDS.find(t => totalCompleted >= t.min)!;
    const nextThreshold = LEVEL_THRESHOLDS
      .slice()
      .reverse()
      .find(t => t.level === levelEntry.level + 1) ?? null;
    const nextLevelAt = nextThreshold ? nextThreshold.min : null;

    // ── Streak ───────────────────────────────────────────────────────────────
    const todayUtc = new Date().toISOString().slice(0, 10);
    const daySet = new Set(
      completed
        .filter(s => s.completedAt)
        .map(s => s.completedAt!.toISOString().slice(0, 10))
    );

    let streak = 0;
    const cursor = new Date();
    if (!daySet.has(todayUtc)) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    while (daySet.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    // ── Domain Badges ────────────────────────────────────────────────────────
    const domainMap: Record<string, { count: number; totalScore: number }> = {};
    for (const s of completed) {
      if (!domainMap[s.domain]) domainMap[s.domain] = { count: 0, totalScore: 0 };
      domainMap[s.domain].count++;
      domainMap[s.domain].totalScore += s.normalizedScore ?? 0;
    }

    const ALL_DOMAINS = ['memory', 'attention', 'processing_speed', 'executive_function', 'language', 'visuospatial'];
    const domainBadges: Record<string, BadgeTier> = Object.fromEntries(ALL_DOMAINS.map(d => [d, 'none' as BadgeTier]));
    for (const [domain, { count, totalScore }] of Object.entries(domainMap)) {
      const avg = totalScore / count;
      const badge = BADGE_TIERS.find(t => count >= t.minSessions && avg >= t.minAvg);
      domainBadges[domain] = badge ? badge.tier : 'none';
    }

    return { streak, level: levelEntry.level, levelLabel: levelEntry.label, nextLevelAt, domainBadges };
  }

  return { getNextExercise, submitExercise, getHistory, scoreStandalone, getStats };
}
