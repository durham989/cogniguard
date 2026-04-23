import { Router, Request, Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import type { DB } from '../db/index';
import { registerUser, loginUser, refreshAccessToken } from '../services/auth.service';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

export function createAuthRouter(db: DB) {
  const router = Router();

  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).max(255),
  });

  router.post('/register', authLimiter, async (req: Request, res: Response) => {
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
        path: '/api/auth/refresh',
      });
      return res.status(201).json({ accessToken, refreshToken, expiresIn: 900, user });
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

  router.post('/login', strictLimiter, async (req: Request, res: Response) => {
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
        path: '/api/auth/refresh',
      });
      return res.json({ accessToken, refreshToken, expiresIn: 900, user });
    } catch (err: any) {
      if (err.code === 'INVALID_CREDENTIALS') return res.status(401).json({ error: 'Invalid credentials' });
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  const refreshSchema = z.object({ refreshToken: z.string().min(1) });

  router.post('/refresh', authLimiter, async (req: Request, res: Response) => {
    // Accept from body (mobile) or cookie (web)
    const bodyToken = refreshSchema.safeParse(req.body).success
      ? req.body.refreshToken as string
      : null;
    const rawToken = bodyToken ?? req.cookies?.refresh_token;

    if (!rawToken) return res.status(400).json({ error: 'Missing refresh token' });

    try {
      const { accessToken, refreshToken, refreshTokenExpiresAt } = await refreshAccessToken(db, rawToken);
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: refreshTokenExpiresAt,
        path: '/api/auth/refresh',
      });
      return res.json({ accessToken, refreshToken, expiresIn: 900 });
    } catch (err: any) {
      if (err.code === 'INVALID_TOKEN' || err.code === 'TOKEN_EXPIRED') {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }
      console.error('Refresh error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
