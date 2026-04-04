import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { DB } from '../db/index';
import { registerUser, loginUser } from '../services/auth.service';

export function createAuthRouter(db: DB) {
  const router = Router();

  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).max(255),
  });

  router.post('/register', async (req: Request, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const { email, password, name } = parsed.data;
    try {
      const { user, accessToken, refreshToken, refreshTokenExpiresAt } = await registerUser(
        db, email, password, name,
      );
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: refreshTokenExpiresAt,
        path: '/auth/refresh',
      });
      return res.status(201).json({ accessToken, expiresIn: 900, user });
    } catch (err: any) {
      if (err.code === 'EMAIL_EXISTS') return res.status(409).json({ error: 'Email already registered' });
      console.error('Register error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });

  router.post('/login', async (req: Request, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
    try {
      const { user, accessToken, refreshToken, refreshTokenExpiresAt } = await loginUser(
        db, parsed.data.email, parsed.data.password,
      );
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: refreshTokenExpiresAt,
        path: '/auth/refresh',
      });
      return res.json({ accessToken, expiresIn: 900, user });
    } catch (err: any) {
      if (err.code === 'INVALID_CREDENTIALS') return res.status(401).json({ error: 'Invalid credentials' });
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Token refresh stub — full implementation in Phase 2
  router.post('/refresh', (_req: Request, res: Response) => {
    return res.status(501).json({ error: 'Token refresh not yet implemented' });
  });

  return router;
}
