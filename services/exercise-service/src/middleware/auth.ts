import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';

export interface AuthRequest extends Request {
  userId: string;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-me');
  try {
    const { payload } = await jwtVerify(header.slice(7), secret);
    (req as AuthRequest).userId = payload.sub!;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
