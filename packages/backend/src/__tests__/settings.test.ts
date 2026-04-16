import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import settingsRouter from '../routes/settings.js';

const app = express();
app.use(express.json());
app.use('/api/settings', settingsRouter);

describe('Settings API', () => {
  it('GET /api/settings should return settings object', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });

  it('PUT /api/settings should update settings', async () => {
    const res = await request(app)
      .put('/api/settings')
      .send({ 'test_key': 'test_value' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const resGet = await request(app).get('/api/settings');
    console.log('GET API returned:', resGet.body);
    expect(resGet.body.test_key).toBe('test_value');
  });
});
