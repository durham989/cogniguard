import { eq, and, desc, isNull } from 'drizzle-orm';
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

  /**
   * Selects the next exercise for a user using round-robin over all exercises.
   * Phase 2 will replace this with Bayesian IRT adaptive selection.
   */
  async function getNextExercise(userId: string): Promise<{ exercise: ExerciseDefinition; sessionId: string }> {
    // Count completed sessions to cycle through exercises in order
    const completed = await db
      .select()
      .from(exerciseSessions)
      .where(and(eq(exerciseSessions.userId, userId), isNull(exerciseSessions.completedAt)));

    // Simple sequential cycling for Phase 1
    const idx = completed.length % EXERCISES.length;
    const exercise = EXERCISES[idx];

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
