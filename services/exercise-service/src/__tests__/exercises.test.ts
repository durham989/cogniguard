import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import { SignJWT } from 'jose';
import { createApp } from '../index';
import { EXERCISES, getExercisesByDomain, getExerciseById } from '../data/exercises';
import type { CognitiveDomain } from '@cogniguard/types';

const JWT_SECRET = new TextEncoder().encode('dev-secret-change-me');

async function makeToken(userId = 'user-123') {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

function makeSession(overrides: Record<string, any> = {}) {
  return {
    id: 'session-1',
    userId: 'user-123',
    exerciseId: 'mem-word-recall',
    domain: 'memory',
    difficulty: 2,
    rawScore: null,
    normalizedScore: null,
    userResponse: null,
    durationSeconds: null,
    conversationId: null,
    startedAt: new Date('2026-01-01'),
    completedAt: null,
    metadata: null,
    ...overrides,
  };
}

function makeDb() {
  const orderByStub = sinon.stub().resolves([]);
  // whereStub must be both awaitable (for getNextExercise) and have .orderBy (for getHistory)
  const whereResult = Object.assign(Promise.resolve([]), { orderBy: orderByStub });
  const whereStub = sinon.stub().returns(whereResult);
  const fromStub = sinon.stub().returns({ where: whereStub });

  const db: any = {
    query: {
      exerciseSessions: { findFirst: sinon.stub() },
    },
    insert: sinon.stub(),
    update: sinon.stub(),
    select: sinon.stub().returns({ from: fromStub }),
  };

  db.insert.returns({
    values: sinon.stub().returns({
      returning: sinon.stub().resolves([makeSession()]),
    }),
  });

  db.update.returns({
    set: sinon.stub().returns({
      where: sinon.stub().resolves([{}]),
    }),
  });

  return { db, orderByStub };
}

// ─── Exercise Library ─────────────────────────────────────────────────────────

describe('Exercise Library', () => {
  const DOMAINS: CognitiveDomain[] = [
    'memory', 'attention', 'processing_speed',
    'executive_function', 'language', 'visuospatial',
  ];

  it('contains exactly 18 exercises', () => {
    expect(EXERCISES).to.have.length(18);
  });

  it('contains exactly 3 exercises per domain', () => {
    for (const domain of DOMAINS) {
      expect(getExercisesByDomain(domain)).to.have.length(3);
    }
  });

  it('every exercise has required fields', () => {
    for (const ex of EXERCISES) {
      expect(ex.id, `${ex.id} missing id`).to.be.a('string').and.not.empty;
      expect(ex.type, `${ex.id} missing type`).to.be.a('string').and.not.empty;
      expect(ex.domain, `${ex.id} missing domain`).to.be.a('string').and.not.empty;
      expect(ex.name, `${ex.id} missing name`).to.be.a('string').and.not.empty;
      expect(ex.conversationalBridges, `${ex.id} needs ≥3 bridges`).to.have.length.gte(3);
      expect(ex.systemPromptFragment, `${ex.id} missing systemPromptFragment`).to.be.a('string').and.not.empty;
      expect(ex.scoringRubric, `${ex.id} missing scoringRubric`).to.be.a('string').and.not.empty;
      expect(ex.difficulty).to.be.gte(1).and.lte(5);
    }
  });

  it('getExerciseById returns the correct exercise', () => {
    const ex = getExerciseById('mem-word-recall');
    expect(ex).to.not.be.undefined;
    expect(ex!.domain).to.equal('memory');
  });

  it('getExerciseById returns undefined for unknown id', () => {
    expect(getExerciseById('does-not-exist')).to.be.undefined;
  });

  it('all exercise IDs are unique', () => {
    const ids = EXERCISES.map(e => e.id);
    const unique = new Set(ids);
    expect(unique.size).to.equal(ids.length);
  });
});

// ─── GET /health ──────────────────────────────────────────────────────────────

describe('GET /health (exercise-service)', () => {
  it('returns 200 with service name', async () => {
    const { db } = makeDb();
    const res = await request(createApp(db)).get('/health');
    expect(res.status).to.equal(200);
    expect(res.body.service).to.equal('exercise-service');
  });
});

// ─── GET /exercises/next ──────────────────────────────────────────────────────

describe('GET /exercises/next', () => {
  afterEach(() => sinon.restore());

  it('returns an exercise with a sessionId', async () => {
    const { db } = makeDb();
    const token = await makeToken();
    const res = await request(createApp(db))
      .get('/exercises/next')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('exercise');
    expect(res.body).to.have.property('sessionId');
    expect(res.body.exercise).to.have.property('domain');
    expect(res.body.exercise).to.have.property('type');
  });

  it('returns 401 without token', async () => {
    const { db } = makeDb();
    const res = await request(createApp(db)).get('/exercises/next');
    expect(res.status).to.equal(401);
  });
});

// ─── POST /exercises/:id/submit ───────────────────────────────────────────────

describe('POST /exercises/:id/submit', () => {
  afterEach(() => sinon.restore());

  const validBody = {
    conversationId: '00000000-0000-0000-0000-000000000001',
    userResponse: 'apple, bridge, cloud, lantern',
    durationSeconds: 45,
    scorePayload: { rawScore: 4, normalizedScore: 50, feedback: 'Good effort!' },
  };

  it('scores an exercise and returns the result', async () => {
    const { db } = makeDb();
    db.query.exerciseSessions.findFirst.resolves(makeSession());
    const token = await makeToken();
    const res = await request(createApp(db))
      .post('/exercises/session-1/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('exerciseSessionId');
    expect(res.body.rawScore).to.equal(4);
    expect(res.body.normalizedScore).to.equal(50);
    expect(res.body.domain).to.equal('memory');
  });

  it('returns 404 for unknown session', async () => {
    const { db } = makeDb();
    db.query.exerciseSessions.findFirst.resolves(null);
    const token = await makeToken();
    const res = await request(createApp(db))
      .post('/exercises/bad-session/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).to.equal(404);
  });

  it('returns 403 for another user\'s session', async () => {
    const { db } = makeDb();
    db.query.exerciseSessions.findFirst.resolves(makeSession({ userId: 'other-user' }));
    const token = await makeToken('user-123');
    const res = await request(createApp(db))
      .post('/exercises/session-1/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).to.equal(403);
  });

  it('returns 409 when session already submitted', async () => {
    const { db } = makeDb();
    db.query.exerciseSessions.findFirst.resolves(makeSession({ completedAt: new Date() }));
    const token = await makeToken();
    const res = await request(createApp(db))
      .post('/exercises/session-1/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).to.equal(409);
  });

  it('returns 400 for invalid request body', async () => {
    const { db } = makeDb();
    const token = await makeToken();
    const res = await request(createApp(db))
      .post('/exercises/session-1/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ conversationId: 'not-a-uuid' });
    expect(res.status).to.equal(400);
  });

  it('returns 401 without token', async () => {
    const { db } = makeDb();
    const res = await request(createApp(db))
      .post('/exercises/session-1/submit')
      .send(validBody);
    expect(res.status).to.equal(401);
  });
});

// ─── GET /exercises/history ───────────────────────────────────────────────────────

describe('GET /exercises/history', () => {
  afterEach(() => sinon.restore());

  it('returns session history for authenticated user', async () => {
    const { db, orderByStub } = makeDb();
    const completedSession = makeSession({
      completedAt: new Date('2026-01-02'),
      rawScore: 4,
      normalizedScore: 50,
    });
    orderByStub.resolves([completedSession]);
    const token = await makeToken();
    const res = await request(createApp(db))
      .get('/exercises/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array').with.length(1);
    expect(res.body[0].id).to.equal('session-1');
  });

  it('returns 401 without token', async () => {
    const { db } = makeDb();
    const res = await request(createApp(db)).get('/exercises/history');
    expect(res.status).to.equal(401);
  });
});
