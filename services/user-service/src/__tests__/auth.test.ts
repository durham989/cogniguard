import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../index';

// Minimal stub DB that satisfies the DB interface for auth routes
function makeDb(overrides: Record<string, any> = {}) {
  const db: any = {
    query: {
      users: { findFirst: sinon.stub() },
    },
    insert: sinon.stub(),
    update: sinon.stub(),
    ...overrides,
  };

  // insert().values().returning() chain
  db.insert.returns({
    values: sinon.stub().returns({
      returning: sinon.stub().resolves([]),
    }),
  });

  return db;
}

function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    passwordHash: bcrypt.hashSync('Password123!', 12),
    dob: null,
    onboardingCompletedAt: null,
    subscriptionTier: 'free',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// ─── POST /auth/register ──────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  let db: any;

  beforeEach(() => {
    db = makeDb();
    // No existing user
    db.query.users.findFirst.resolves(null);
    // Insert chain returns new user, then empty arrays for profile/consents/refresh token
    let insertCallCount = 0;
    db.insert.callsFake(() => ({
      values: sinon.stub().returns({
        returning: sinon.stub().callsFake(async () => {
          insertCallCount++;
          if (insertCallCount === 1) return [makeUser()]; // users insert
          return [{}]; // cognitive_profiles, consents, refresh_tokens
        }),
      }),
    }));
  });

  afterEach(() => sinon.restore());

  it('returns 201 with accessToken and user on valid registration', async () => {
    const app = createApp(db);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123!', name: 'Test User' });

    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('accessToken');
    expect(res.body).to.have.property('user');
    expect(res.body.user.email).to.equal('test@example.com');
    expect(res.body.user).to.not.have.property('passwordHash');
    expect(res.headers['set-cookie']).to.exist;
  });

  it('returns 409 when email is already registered', async () => {
    db.query.users.findFirst.resolves(makeUser());
    const app = createApp(db);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123!', name: 'Test User' });

    expect(res.status).to.equal(409);
    expect(res.body.error).to.equal('Email already registered');
  });

  it('returns 400 for invalid email', async () => {
    const app = createApp(db);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'Password123!', name: 'Test' });

    expect(res.status).to.equal(400);
  });

  it('returns 400 for password shorter than 8 characters', async () => {
    const app = createApp(db);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'short', name: 'Test' });

    expect(res.status).to.equal(400);
  });

  it('returns 400 for missing name', async () => {
    const app = createApp(db);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123!' });

    expect(res.status).to.equal(400);
  });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  let db: any;

  beforeEach(() => {
    db = makeDb();
    // insert for refresh token
    db.insert.returns({
      values: sinon.stub().returns({
        returning: sinon.stub().resolves([{}]),
      }),
    });
  });

  afterEach(() => sinon.restore());

  it('returns 200 with accessToken and refresh token cookie on valid credentials', async () => {
    db.query.users.findFirst.resolves(makeUser());
    const app = createApp(db);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123!' });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('accessToken');
    expect(res.body.user.email).to.equal('test@example.com');
    expect(res.headers['set-cookie']).to.exist;
  });

  it('returns 401 for wrong password', async () => {
    db.query.users.findFirst.resolves(makeUser());
    const app = createApp(db);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword!' });

    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal('Invalid credentials');
  });

  it('returns 401 for unknown email', async () => {
    db.query.users.findFirst.resolves(null);
    const app = createApp(db);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Password123!' });

    expect(res.status).to.equal(401);
  });

  it('returns 400 for malformed request body', async () => {
    const app = createApp(db);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email' });

    expect(res.status).to.equal(400);
  });
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

function makeRefreshDb(tokenOverrides: Record<string, any> = {}) {
  const tokenRecord = {
    id: 'rt-1',
    userId: 'user-123',
    tokenHash: 'some-hash',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days out
    createdAt: new Date(),
    ...tokenOverrides,
  };

  const db: any = {
    query: {
      users: { findFirst: sinon.stub() },
      refreshTokens: { findFirst: sinon.stub().resolves(tokenRecord) },
    },
    insert: sinon.stub(),
    update: sinon.stub(),
    delete: sinon.stub(),
  };

  // insert chain for new refresh token (generateRefreshToken writes to DB)
  db.insert.returns({
    values: sinon.stub().returns({
      returning: sinon.stub().resolves([{}]),
    }),
  });

  // delete chain (rotate old token)
  db.delete.returns({
    where: sinon.stub().resolves([]),
  });

  return db;
}

describe('POST /auth/refresh', () => {
  afterEach(() => sinon.restore());

  it('returns 200 with new accessToken and refreshToken when body token is valid', async () => {
    const db = makeRefreshDb();
    const app = createApp(db);
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'any-raw-token' });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('accessToken');
    expect(res.body).to.have.property('refreshToken');
    expect(res.headers['set-cookie']).to.exist;
  });

  it('returns 200 when refresh token is supplied via httpOnly cookie', async () => {
    const db = makeRefreshDb();
    const app = createApp(db);
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refresh_token=cookie-raw-token')
      .send({}); // no body token

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('accessToken');
  });

  it('returns 400 when no refresh token is provided in body or cookie', async () => {
    const db = makeRefreshDb();
    const app = createApp(db);
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});

    expect(res.status).to.equal(400);
    expect(res.body.error).to.equal('Missing refresh token');
  });

  it('returns 401 for an invalid (unrecognised) refresh token', async () => {
    const db = makeRefreshDb();
    db.query.refreshTokens.findFirst.resolves(null); // not in DB
    const app = createApp(db);
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'bad-token' });

    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal('Invalid or expired refresh token');
  });

  it('returns 401 for an expired refresh token', async () => {
    const db = makeRefreshDb({ expiresAt: new Date(Date.now() - 1000) }); // already past
    const app = createApp(db);
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'expired-raw-token' });

    expect(res.status).to.equal(401);
    expect(res.body.error).to.equal('Invalid or expired refresh token');
  });
});
