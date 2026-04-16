import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import aiRouter from '../routes/ai.js';
import { db } from '../db/index.js';

// Mock the AI module so we do not actually make requests
vi.mock('../services/ai/adapter.js', () => ({
  callAI: vi.fn().mockResolvedValue('MOCKED_AI_RESPONSE')
}));

import { callAI } from '../services/ai/adapter.js';

const app = express();
app.use(express.json());
app.use('/api/ai', aiRouter);

describe('AI API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.prepare('DELETE FROM settings').run();
    db.prepare("INSERT INTO settings (key, value) VALUES ('api_key_openai', 'dummy_key'), ('active_model', 'openai')").run();
  });

  it('POST /api/ai/ask requires text or history', async () => {
    const res = await request(app).post('/api/ai/ask').send({ bookId: '123' });
    expect(res.status).toBe(400);
  });

  it('POST /api/ai/ask calls AI and processes action prompts', async () => {
    const res = await request(app)
      .post('/api/ai/ask')
      .send({ bookId: '123', action: 'feynman', text: 'Target content here', history: [] });
    
    expect(res.status).toBe(200);
    expect(res.body.reply).toBe('MOCKED_AI_RESPONSE');
    
    // Check if callAI was called properly
    expect(callAI).toHaveBeenCalledTimes(1);
    const callArgs = (callAI as any).mock.calls[0][0];
    expect(callArgs.systemPrompt).toContain('费曼');
  });

  it('POST /api/ai/ask applies global user profile and book goals to prompt context', async () => {
    // Add context to db
    db.prepare("INSERT INTO settings (key, value) VALUES ('user_profile', '我是测试用户')").run();
    db.prepare("INSERT INTO settings (key, value) VALUES ('book_goal_123', '这是测试目标')").run();
    
    await request(app)
      .post('/api/ai/ask')
      .send({ bookId: '123', action: 'actionlist', text: 'Some text', history: [] });
    
    expect(callAI).toHaveBeenCalledTimes(1);
    const callArgs = (callAI as any).mock.calls[0][0];
    // Check if the system prompt was decorated with the profile and goal
    expect(callArgs.systemPrompt).toContain('我是测试用户');
    expect(callArgs.systemPrompt).toContain('这是测试目标');
    expect(callArgs.systemPrompt).toContain('行动力教练');
  });
});
