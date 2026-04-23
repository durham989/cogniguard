import { Router, type Router as ExpressRouter, Response } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/auth';
import type { ExerciseServiceDeps } from '../services/exercise.service';
import { createExerciseService } from '../services/exercise.service';

export function createExercisesRouter(deps: ExerciseServiceDeps): ExpressRouter {
  const router = Router();
  const exerciseService = createExerciseService(deps);

  router.use(requireAuth);

  router.get('/next', async (req, res: Response) => {
    const { userId } = req as unknown as AuthRequest;
    try {
      const result = await exerciseService.getNextExercise(userId);
      return res.json(result);
    } catch (err) {
      console.error('Get next exercise error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  const submitSchema = z.object({
    conversationId: z.string().uuid(),
    userResponse: z.string().min(1).max(8000),
    durationSeconds: z.number().positive(),
    scorePayload: z.object({
      rawScore: z.number(),
      normalizedScore: z.number().min(0).max(100),
      feedback: z.string(),
    }),
  });

  router.post('/:id/submit', async (req, res: Response) => {
    const { userId } = req as unknown as AuthRequest;
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    try {
      const result = await exerciseService.submitExercise(
        req.params.id,
        userId,
        parsed.data.conversationId,
        parsed.data.userResponse,
        parsed.data.durationSeconds,
        parsed.data.scorePayload,
      );
      return res.json(result);
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Exercise session not found' });
      if (err.code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
      if (err.code === 'ALREADY_SUBMITTED') return res.status(409).json({ error: 'Exercise already submitted' });
      console.error('Submit exercise error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/history', async (req, res: Response) => {
    const { userId } = req as unknown as AuthRequest;
    try {
      const sessions = await exerciseService.getHistory(userId);
      return res.json(sessions);
    } catch (err) {
      console.error('Get history error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/stats', async (req, res: Response) => {
    const { userId } = req as unknown as AuthRequest;
    try {
      const stats = await exerciseService.getStats(userId);
      return res.json(stats);
    } catch (err) {
      console.error('Get stats error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/trends', async (req, res: Response) => {
    const { userId } = req as unknown as AuthRequest;
    try {
      const trends = await exerciseService.getTrends(userId);
      return res.json(trends);
    } catch (err) {
      console.error('Get trends error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  const scoreStandaloneSchema = z.object({
    userResponse: z.string().min(1).max(8000),
    durationSeconds: z.number().positive(),
  });

  router.post('/:id/score-standalone', async (req, res: Response) => {
    const { userId } = req as unknown as AuthRequest;
    const parsed = scoreStandaloneSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    try {
      const result = await exerciseService.scoreStandalone(
        req.params.id,
        userId,
        parsed.data.userResponse,
        parsed.data.durationSeconds,
      );
      return res.json(result);
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Exercise session not found' });
      if (err.code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden' });
      if (err.code === 'ALREADY_SUBMITTED') return res.status(409).json({ error: 'Exercise already submitted' });
      console.error('Score standalone error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
