import { eq, and, desc, isNotNull } from 'drizzle-orm';
import type { DB } from '../db/index';
import { exerciseSessions } from '../db/schema';
import { EXERCISES, getExerciseById } from '../data/exercises';
import type { ExerciseDefinition, ExerciseResult, CognitiveDomain } from '@cogniguard/types';
import type { ClaudeScorer } from './claude.service';

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

  return { getNextExercise, submitExercise, getHistory, scoreStandalone };
}
