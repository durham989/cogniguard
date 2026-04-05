import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import type { DB } from '../db/index';
import { users, refreshTokens, cognitiveProfiles, consents } from '../db/schema';
import type { User } from '@cogniguard/types';

const JWT_SECRET_RAW = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRES_IN ?? '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function getSecret() {
  return new TextEncoder().encode(JWT_SECRET_RAW);
}

/** SHA-256 hash of a high-entropy random token — fast lookup, no bcrypt needed. */
function hashRefreshToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, getSecret());
  if (!payload.sub) throw new Error('Invalid token');
  return payload.sub;
}

export async function generateRefreshToken(
  db: DB,
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const rawToken = crypto.randomUUID() + '-' + crypto.randomUUID();
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });
  return { token: rawToken, expiresAt };
}

/**
 * Verifies a refresh token, rotates it, and returns a new access + refresh token pair.
 * Throws with code INVALID_TOKEN or TOKEN_EXPIRED on failure.
 */
export async function refreshAccessToken(
  db: DB,
  rawToken: string,
): Promise<{ accessToken: string; refreshToken: string; refreshTokenExpiresAt: Date }> {
  const tokenHash = hashRefreshToken(rawToken);
  const record = await db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.tokenHash, tokenHash),
  });

  if (!record) throw Object.assign(new Error('Invalid refresh token'), { code: 'INVALID_TOKEN' });
  if (record.expiresAt < new Date()) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, record.id));
    throw Object.assign(new Error('Refresh token expired'), { code: 'TOKEN_EXPIRED' });
  }

  // Rotate: delete old, issue new
  await db.delete(refreshTokens).where(eq(refreshTokens.id, record.id));

  const [accessToken, { token: refreshToken, expiresAt: refreshTokenExpiresAt }] = await Promise.all([
    generateAccessToken(record.userId),
    generateRefreshToken(db, record.userId),
  ]);

  return { accessToken, refreshToken, refreshTokenExpiresAt };
}

function toUserDto(user: typeof users.$inferSelect): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    dob: user.dob ?? null,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    subscriptionTier: user.subscriptionTier,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function registerUser(
  db: DB,
  email: string,
  password: string,
  name: string,
): Promise<{ user: User; accessToken: string; refreshToken: string; refreshTokenExpiresAt: Date }> {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) throw Object.assign(new Error('Email already registered'), { code: 'EMAIL_EXISTS' });

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ email, passwordHash, name }).returning();

  await Promise.all([
    db.insert(cognitiveProfiles).values({ userId: user.id, domains: {} }),
    db.insert(consents).values({ userId: user.id }),
  ]);

  const [accessToken, { token: refreshToken, expiresAt: refreshTokenExpiresAt }] = await Promise.all([
    generateAccessToken(user.id),
    generateRefreshToken(db, user.id),
  ]);

  return { user: toUserDto(user), accessToken, refreshToken, refreshTokenExpiresAt };
}

export async function loginUser(
  db: DB,
  email: string,
  password: string,
): Promise<{ user: User; accessToken: string; refreshToken: string; refreshTokenExpiresAt: Date }> {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !user.passwordHash) {
    throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS' });

  const [accessToken, { token: refreshToken, expiresAt: refreshTokenExpiresAt }] = await Promise.all([
    generateAccessToken(user.id),
    generateRefreshToken(db, user.id),
  ]);

  return { user: toUserDto(user), accessToken, refreshToken, refreshTokenExpiresAt };
}
