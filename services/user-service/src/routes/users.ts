import { Router, Response } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import type { DB } from '../db/index';
import { users, consents } from '../db/schema';
import { requireAuth, AuthRequest } from '../middleware/auth';

export function createUsersRouter(db: DB) {
  const router = Router();
  router.use(requireAuth);

  router.get('/me', async (req, res: Response) => {
    const { userId } = req as AuthRequest;
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      dob: user.dob ?? null,
      onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
      subscriptionTier: user.subscriptionTier,
      createdAt: user.createdAt.toISOString(),
    });
  });

  const updateProfileSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    healthContext: z.object({
      medications: z.array(z.string()).optional(),
      familyHistory: z.boolean().optional(),
      selfReportedConcerns: z.string().max(2000).optional(),
    }).optional(),
    consent: z.object({
      conversationalAI: z.boolean().optional(),
      cognitiveTracking: z.boolean().optional(),
      linguisticMonitoring: z.boolean().optional(),
      clinicalReports: z.boolean().optional(),
    }).optional(),
  });

  router.patch('/me', async (req, res: Response) => {
    const { userId } = req as AuthRequest;
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

    const { name, dob, healthContext, consent } = parsed.data;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (dob) updates.dob = dob;
    if (healthContext) updates.healthContext = healthContext;

    const [updated] = await db.update(users).set(updates).where(eq(users.id, userId)).returning();

    if (consent) {
      await db.update(consents).set({ ...consent, updatedAt: new Date() }).where(eq(consents.userId, userId));
    }

    return res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      dob: updated.dob ?? null,
      onboardingCompletedAt: updated.onboardingCompletedAt?.toISOString() ?? null,
      subscriptionTier: updated.subscriptionTier,
      createdAt: updated.createdAt.toISOString(),
    });
  });

  router.post('/me/complete-onboarding', async (req, res: Response) => {
    const { userId } = req as AuthRequest;
    const [updated] = await db
      .update(users)
      .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      dob: updated.dob ?? null,
      onboardingCompletedAt: updated.onboardingCompletedAt?.toISOString() ?? null,
      subscriptionTier: updated.subscriptionTier,
      createdAt: updated.createdAt.toISOString(),
    });
  });

  return router;
}
