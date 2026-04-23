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

function makeMockScorer() {
  return {
    score: sinon.stub().resolves({ rawScore: 4, normalizedScore: 50, feedback: 'Good effort!' }),
  };
}

// ─── Exercise Library ─────────────────────────────────────────────────────────

describe('Exercise Library', () => {
  const DOMAINS: CognitiveDomain[] = [
    'memory', 'attention', 'processing_speed',
    'executive_function', 'language', 'visuospatial',
  ];

  it('contains exactly 24 exercises', () => {
    expect(EXERCISES).to.have.length(24);
  });

  it('contains expected exercises per domain', () => {
    // After expansion: memory(4), attention(4), processing_speed(3), executive_function(5), language(5), visuospatial(3)
    const expectedCounts: Record<CognitiveDomain, number> = {
      memory: 4,
      attention: 4,
      processing_speed: 3,
      executive_function: 5,
      language: 5,
      visuospatial: 3,
    };
    for (const domain of DOMAINS) {
      expect(getExercisesByDomain(domain)).to.have.length(expectedCounts[domain]);
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
    const res = await request(createApp({ db })).get('/health');
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
    const res = await request(createApp({ db }))
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
    const res = await request(createApp({ db })).get('/exercises/next');
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
    const res = await request(createApp({ db }))
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
    const res = await request(createApp({ db }))
      .post('/exercises/bad-session/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).to.equal(404);
  });

  it('returns 403 for another user\'s session', async () => {
    const { db } = makeDb();
    db.query.exerciseSessions.findFirst.resolves(makeSession({ userId: 'other-user' }));
    const token = await makeToken('user-123');
    const res = await request(createApp({ db }))
      .post('/exercises/session-1/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).to.equal(403);
  });

  it('returns 409 when session already submitted', async () => {
    const { db } = makeDb();
    db.query.exerciseSessions.findFirst.resolves(makeSession({ completedAt: new Date() }));
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .post('/exercises/session-1/submit')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).to.equal(409);
  });

  it('returns 400 for invalid request body', async () => {
    const { db } = makeDb();
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .post('/exercises/session-1/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ conversationId: 'not-a-uuid' });
    expect(res.status).to.equal(400);
  });

  it('returns 401 without token', async () => {
    const { db } = makeDb();
    const res = await request(createApp({ db }))
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
    const res = await request(createApp({ db }))
      .get('/exercises/history')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array').with.length(1);
    expect(res.body[0].id).to.equal('session-1');
  });

  it('returns 401 without token', async () => {
    const { db } = makeDb();
    const res = await request(createApp({ db })).get('/exercises/history');
    expect(res.status).to.equal(401);
  });
});

// ─── GET /exercises/stats ─────────────────────────────────────────────────────

function makeStatsDb(sessions: Record<string, any>[] = []) {
  const { db } = makeDb();
  const resolvedSessions = sessions.map(s => makeSession(s));
  const whereStub = sinon.stub().resolves(resolvedSessions);
  db.select.returns({
    from: sinon.stub().returns({
      where: whereStub,
    }),
  });
  return { db, whereStub };
}

describe('GET /exercises/stats', () => {
  afterEach(() => sinon.restore());

  it('returns streak=0 and level 1 for user with no completed sessions', async () => {
    const { db } = makeStatsDb([]);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.streak).to.equal(0);
    expect(res.body.level).to.equal(1);
    expect(res.body.levelLabel).to.equal('Beginner');
    expect(res.body.nextLevelAt).to.equal(10);
    expect(res.body.domainBadges).to.be.an('object');
  });

  it('returns level 2 (Apprentice) when 10 sessions are completed', async () => {
    const sessions = Array.from({ length: 10 }, (_, i) => ({
      completedAt: new Date(Date.now() - i * 86400000),
      normalizedScore: 60,
      domain: 'memory',
    }));
    const { db } = makeStatsDb(sessions);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.level).to.equal(2);
    expect(res.body.levelLabel).to.equal('Apprentice');
    expect(res.body.nextLevelAt).to.equal(25);
  });

  it('returns streak=1 when one session completed today', async () => {
    const { db } = makeStatsDb([{ completedAt: new Date(), normalizedScore: 50, domain: 'memory' }]);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.streak).to.equal(1);
  });

  it('returns silver badge for memory after 5 sessions with avg >= 50', async () => {
    const sessions = Array.from({ length: 5 }, (_, i) => ({
      completedAt: new Date(Date.now() - i * 86400000),
      normalizedScore: 65,
      domain: 'memory',
    }));
    const { db } = makeStatsDb(sessions);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.domainBadges.memory).to.equal('silver');
  });

  it('returns 401 without token', async () => {
    const { db } = makeStatsDb([]);
    const res = await request(createApp({ db })).get('/exercises/stats');
    expect(res.status).to.equal(401);
  });
});

// ─── GET /exercises/trends ────────────────────────────────────────────────────

function makeTrendsDb(sessions: Partial<ReturnType<typeof makeSession>>[] = []) {
  const { db } = makeDb();
  const resolved = sessions.map(s => makeSession(s as any));
  db.select.returns({
    from: sinon.stub().returns({
      where: sinon.stub().resolves(resolved),
    }),
  });
  return { db };
}

describe('GET /exercises/trends', () => {
  afterEach(() => sinon.restore());

  it('returns empty array when user has no completed sessions', async () => {
    const { db } = makeTrendsDb([]);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/trends')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal([]);
  });

  it('returns domain trends grouped by week', async () => {
    const monday = new Date('2026-04-06'); // Monday of week 15
    const { db } = makeTrendsDb([
      { completedAt: monday as any, normalizedScore: 60 as any, domain: 'memory' },
      { completedAt: monday as any, normalizedScore: 80 as any, domain: 'memory' },
    ]);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/trends')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    const memoryTrend = res.body.find((t: any) => t.domain === 'memory');
    expect(memoryTrend).to.exist;
    expect(memoryTrend.weeks).to.be.an('array');
    expect(memoryTrend.weeks[0].avg).to.equal(70); // (60+80)/2
    expect(memoryTrend.weeks[0].count).to.equal(2);
  });

  it('returns 401 without token', async () => {
    const { db } = makeTrendsDb([]);
    const res = await request(createApp({ db })).get('/exercises/trends');
    expect(res.status).to.equal(401);
  });
});

// ─── Adaptive next exercise ───────────────────────────────────────────────────

function makeAdaptiveDb(completedSessions: Partial<ReturnType<typeof makeSession>>[] = []) {
  const resolved = completedSessions.map(s => makeSession(s as any));
  const db: any = {
    query: { exerciseSessions: { findFirst: sinon.stub().resolves(null) } },
    select: sinon.stub(),
    insert: sinon.stub(),
  };

  // select chain for fetching completed sessions
  db.select.returns({
    from: sinon.stub().returns({
      where: sinon.stub().resolves(resolved),
    }),
  });

  // insert chain for creating session record
  db.insert.returns({
    values: sinon.stub().returns({
      returning: sinon.stub().resolves([makeSession()]),
    }),
  });

  return { db };
}

describe('GET /exercises/next (adaptive)', () => {
  afterEach(() => sinon.restore());

  it('returns an exercise from the domain with fewest sessions', async () => {
    // Only memory sessions completed → should pick a non-memory domain next
    const sessions = Array.from({ length: 5 }, () =>
      makeSession({ domain: 'memory', normalizedScore: 60, completedAt: new Date() })
    );
    const { db } = makeAdaptiveDb(sessions);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/next')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body.exercise.domain).to.not.equal('memory');
  });

  it('targets higher difficulty when recent avg ≥ 75%', async () => {
    // 10 attention sessions at difficulty 2, all scoring 80 (≥ 75)
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeSession({ domain: 'attention', difficulty: 2, normalizedScore: 80, completedAt: new Date(Date.now() - i * 1000) })
    );
    // Give all other domains more sessions so attention is selected
    const allSessions = [
      ...sessions,
      ...Array.from({ length: 15 }, () => makeSession({ domain: 'memory', normalizedScore: 60, completedAt: new Date() })),
      ...Array.from({ length: 15 }, () => makeSession({ domain: 'executive_function', normalizedScore: 60, completedAt: new Date() })),
      ...Array.from({ length: 15 }, () => makeSession({ domain: 'language', normalizedScore: 60, completedAt: new Date() })),
      ...Array.from({ length: 15 }, () => makeSession({ domain: 'processing_speed', normalizedScore: 60, completedAt: new Date() })),
      ...Array.from({ length: 15 }, () => makeSession({ domain: 'visuospatial', normalizedScore: 60, completedAt: new Date() })),
    ];
    const { db } = makeAdaptiveDb(allSessions);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/next')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    // Should select difficulty ≥ 3 for attention (was 2, avg ≥ 75 → step up to 3)
    expect(res.body.exercise.difficulty).to.be.at.least(3);
    expect(res.body.exercise.domain).to.equal('attention');
  });

  it('returns 200 for a brand-new user with no sessions', async () => {
    const { db } = makeAdaptiveDb([]);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/exercises/next')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('exercise');
    expect(res.body).to.have.property('sessionId');
  });
});

// ─── POST /exercises/:id/score-standalone ────────────────────────────────────

describe('POST /exercises/:id/score-standalone', () => {
  afterEach(() => sinon.restore());

  const validBody = {
    userResponse: 'apple, bridge, lantern',
    durationSeconds: 45,
  };

  it('scores a standalone exercise and returns ExerciseResult', async () => {
    const { db } = makeDb();
    db.query.exerciseSessions.findFirst.resolves(makeSession());
    const scorer = makeMockScorer();
    const token = await makeToken();
    const res = await request(createApp({ db, scorer }))
      .post('/exercises/session-1/score-standalone')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);

    expect(res.status).to.equal(200);
    expect(res.body.exerciseSessionId).to.equal('session-1');
    expect(res.body.rawScore).to.equal(4);
    expect(res.body.normalizedScore).to.equal(50);
    expect(res.body.domain).to.equal('memory');
    expect(res.body.feedback).to.equal('Good effort!');
    expect(scorer.score.calledOnce).to.be.true;
  });

  it('returns 404 for unknown session', async () => {
    const { db } = makeDb();
    db.query.exerciseSessions.findFirst.resolves(null);
    const scorer = makeMockScorer();
    const token = await makeToken();
    const res = await request(createApp({ db, scorer }))
      .post('/exercises/bad-session/score-standalone')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).to.equal(404);
  });

  it('returns 403 for another user\'s session', async () => {
    const { db } = makeDb();
    db.query.exerciseSessions.findFirst.resolves(makeSession({ userId: 'other-user' }));
    const scorer = makeMockScorer();
    const token = await makeToken('user-123');
    const res = await request(createApp({ db, scorer }))
      .post('/exercises/session-1/score-standalone')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).to.equal(403);
  });

  it('returns 409 when session already submitted', async () => {
    const { db } = makeDb();
    db.query.exerciseSessions.findFirst.resolves(makeSession({ completedAt: new Date() }));
    const scorer = makeMockScorer();
    const token = await makeToken();
    const res = await request(createApp({ db, scorer }))
      .post('/exercises/session-1/score-standalone')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);
    expect(res.status).to.equal(409);
  });

  it('returns 400 for invalid request body', async () => {
    const { db } = makeDb();
    const scorer = makeMockScorer();
    const token = await makeToken();
    const res = await request(createApp({ db, scorer }))
      .post('/exercises/session-1/score-standalone')
      .set('Authorization', `Bearer ${token}`)
      .send({ userResponse: '' });
    expect(res.status).to.equal(400);
  });

  it('returns 401 without token', async () => {
    const { db } = makeDb();
    const scorer = makeMockScorer();
    const res = await request(createApp({ db, scorer }))
      .post('/exercises/session-1/score-standalone')
      .send(validBody);
    expect(res.status).to.equal(401);
  });
});
