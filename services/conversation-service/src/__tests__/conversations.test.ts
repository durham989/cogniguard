import { expect } from 'chai';
import sinon from 'sinon';
import request from 'supertest';
import { SignJWT } from 'jose';
import { createApp } from '../index';
import type { ClaudeClient } from '../services/claude.service';

const JWT_SECRET = new TextEncoder().encode('dev-secret-change-me');

async function makeToken(userId = 'user-123') {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

function makeConversation(overrides: Record<string, any> = {}) {
  return {
    id: 'conv-1',
    userId: 'user-123',
    state: 'GREETING',
    startedAt: new Date('2026-01-01'),
    endedAt: null,
    ...overrides,
  };
}

function makeMessage(overrides: Record<string, any> = {}) {
  return {
    id: 'msg-1',
    conversationId: 'conv-1',
    role: 'assistant',
    content: 'Hello there!',
    tokens: 5,
    metadata: null,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeDb(overrides: Record<string, any> = {}) {
  const db: any = {
    query: {
      conversations: { findFirst: sinon.stub() },
      messages: { findMany: sinon.stub() },
    },
    insert: sinon.stub(),
    select: sinon.stub(),
    ...overrides,
  };

  db.insert.returns({
    values: sinon.stub().returns({
      returning: sinon.stub().resolves([makeConversation()]),
    }),
  });

  // select().from().where().orderBy() chain
  const orderByStub = sinon.stub().resolves([]);
  const whereStub = sinon.stub().returns({ orderBy: orderByStub });
  const fromStub = sinon.stub().returns({ where: whereStub });
  db.select.returns({ from: fromStub });

  return { db, orderByStub, whereStub, fromStub };
}

function makeClaudeMock(): ClaudeClient {
  return {
    stream: sinon.stub().callsFake(async (_msgs, _sys, cb) => {
      cb.onDelta('Hello ');
      cb.onDelta('there!');
      await cb.onComplete('Hello there!', 10, 5);
    }),
  };
}

// ─── GET /health ──────────────────────────────────────────────────────────────

describe('GET /health (conversation-service)', () => {
  it('returns 200 with service name', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).to.equal(200);
    expect(res.body.service).to.equal('conversation-service');
  });
});

// ─── POST /conversations ──────────────────────────────────────────────────────

describe('POST /conversations', () => {
  afterEach(() => sinon.restore());

  it('creates and returns a conversation', async () => {
    const { db } = makeDb();
    const app = createApp({ db });
    const token = await makeToken();
    const res = await request(app)
      .post('/conversations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('id');
    expect(res.body.state).to.equal('GREETING');
  });

  it('returns 401 without token', async () => {
    const { db } = makeDb();
    const app = createApp({ db });
    const res = await request(app).post('/conversations');
    expect(res.status).to.equal(401);
  });
});

// ─── GET /conversations/:id/messages ─────────────────────────────────────────

describe('GET /conversations/:id/messages', () => {
  afterEach(() => sinon.restore());

  it('returns messages for own conversation', async () => {
    const { db, orderByStub } = makeDb();
    db.query.conversations.findFirst.resolves(makeConversation());
    orderByStub.resolves([makeMessage()]);

    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/conversations/conv-1/messages')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an('array');
    expect(res.body[0].role).to.equal('assistant');
  });

  it('returns 404 for unknown conversation', async () => {
    const { db } = makeDb();
    db.query.conversations.findFirst.resolves(null);
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .get('/conversations/bad-id/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).to.equal(404);
  });

  it('returns 403 for another user\'s conversation', async () => {
    const { db } = makeDb();
    db.query.conversations.findFirst.resolves(makeConversation({ userId: 'other-user' }));
    const token = await makeToken('user-123');
    const res = await request(createApp({ db }))
      .get('/conversations/conv-1/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).to.equal(403);
  });
});

// ─── POST /conversations/:id/messages (SSE) ───────────────────────────────────

describe('POST /conversations/:id/messages', () => {
  afterEach(() => sinon.restore());

  it('streams SSE events including message.delta and message.complete', async () => {
    const { db, orderByStub } = makeDb();
    db.query.conversations.findFirst.resolves(makeConversation());
    orderByStub.resolves([makeMessage({ role: 'user', content: 'Hello' })]);

    // User message insert has no .returning(); only assistant message calls .returning()
    db.insert.callsFake(() => ({
      values: sinon.stub().returns({
        returning: sinon.stub().resolves([makeMessage({ role: 'assistant', content: 'Hello there!' })]),
      }),
    }));

    const claude = makeClaudeMock();
    const token = await makeToken();
    const res = await request(createApp({ db, claude }))
      .post('/conversations/conv-1/messages')
      .set('Authorization', `Bearer ${token}`)
      .set('Accept', 'text/event-stream')
      .send({ content: 'Hello' });

    expect(res.status).to.equal(200);
    expect(res.headers['content-type']).to.include('text/event-stream');
    expect(res.text).to.include('event: message.delta');
    expect(res.text).to.include('event: message.complete');
  });

  it('returns 400 for empty content', async () => {
    const { db } = makeDb();
    db.query.conversations.findFirst.resolves(makeConversation());
    const token = await makeToken();
    const res = await request(createApp({ db }))
      .post('/conversations/conv-1/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '' });
    expect(res.status).to.equal(400);
  });

  it('returns 401 without token', async () => {
    const { db } = makeDb();
    const res = await request(createApp({ db }))
      .post('/conversations/conv-1/messages')
      .send({ content: 'Hello' });
    expect(res.status).to.equal(401);
  });
});
