import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import { SignJWT } from 'jose';
import { createApp } from '../index';

const JWT_SECRET = new TextEncoder().encode('dev-secret-change-me');

async function makeToken(userId = 'user-123') {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

function makeUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    dob: null,
    onboardingCompletedAt: null,
    subscriptionTier: 'free',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeDb(overrides: Record<string, any> = {}) {
  const db: any = {
    query: { users: { findFirst: sinon.stub() } },
    update: sinon.stub(),
    ...overrides,
  };
  db.update.returns({
    set: sinon.stub().returns({
      where: sinon.stub().returns({
        returning: sinon.stub().resolves([makeUser()]),
      }),
    }),
  });
  return db;
}

// ─── GET /users/me ────────────────────────────────────────────────────────────

describe('GET /users/me', () => {
  afterEach(() => sinon.restore());

  it('returns 200 with user profile when authenticated', async () => {
    const db = makeDb();
    db.query.users.findFirst.resolves(makeUser());
    const token = await makeToken();
    const res = await request(createApp(db))
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.email).to.equal('test@example.com');
    expect(res.body).to.not.have.property('passwordHash');
  });

  it('returns 401 without Authorization header', async () => {
    const db = makeDb();
    const res = await request(createApp(db)).get('/api/users/me');
    expect(res.status).to.equal(401);
  });

  it('returns 401 with a malformed token', async () => {
    const db = makeDb();
    const res = await request(createApp(db))
      .get('/api/users/me')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).to.equal(401);
  });

  it('returns 404 when authenticated user no longer exists in DB', async () => {
    const db = makeDb();
    db.query.users.findFirst.resolves(null);
    const token = await makeToken();
    const res = await request(createApp(db))
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).to.equal(404);
  });
});

// ─── PATCH /users/me ──────────────────────────────────────────────────────────

describe('PATCH /users/me', () => {
  afterEach(() => sinon.restore());

  it('updates and returns the user profile', async () => {
    const db = makeDb();
    db.query.users.findFirst.resolves(makeUser());
    db.update.returns({
      set: sinon.stub().returns({
        where: sinon.stub().returns({
          returning: sinon.stub().resolves([makeUser({ name: 'Updated Name' })]),
        }),
      }),
    });
    const token = await makeToken();
    const res = await request(createApp(db))
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });

    expect(res.status).to.equal(200);
    expect(res.body.name).to.equal('Updated Name');
  });

  it('returns 400 for invalid dob format', async () => {
    const db = makeDb();
    const token = await makeToken();
    const res = await request(createApp(db))
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ dob: '01/01/1980' }); // wrong format, should be YYYY-MM-DD

    expect(res.status).to.equal(400);
  });

  it('returns 401 without token', async () => {
    const db = makeDb();
    const res = await request(createApp(db))
      .patch('/api/users/me')
      .send({ name: 'No Auth' });
    expect(res.status).to.equal(401);
  });
});

// ─── POST /users/me/complete-onboarding ──────────────────────────────────────

describe('POST /users/me/complete-onboarding', () => {
  afterEach(() => sinon.restore());

  it('marks onboarding complete and returns updated user', async () => {
    const now = new Date();
    const db = makeDb();
    db.update.returns({
      set: sinon.stub().returns({
        where: sinon.stub().returns({
          returning: sinon.stub().resolves([makeUser({ onboardingCompletedAt: now })]),
        }),
      }),
    });
    const token = await makeToken();
    const res = await request(createApp(db))
      .post('/api/users/me/complete-onboarding')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.onboardingCompletedAt).to.be.a('string');
  });

  it('returns 401 without token', async () => {
    const db = makeDb();
    const res = await request(createApp(db)).post('/api/users/me/complete-onboarding');
    expect(res.status).to.equal(401);
  });
});
