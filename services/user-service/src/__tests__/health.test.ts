import { expect } from 'chai';
import request from 'supertest';
import { createApp } from '../index';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).to.equal(200);
    expect(res.body).to.deep.equal({ status: 'ok', service: 'user-service' });
  });
});
