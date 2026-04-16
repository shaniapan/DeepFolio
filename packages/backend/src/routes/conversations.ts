import { Router, json } from 'express';
import crypto from 'crypto';
import { db } from '../db/index.js';

const router = Router();

// 获取该书的所有对话记录
router.get('/:id/conversations', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM conversations WHERE book_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);
  res.json(rows);
});

// 保存一条新的对话消息
router.post('/:id/conversations', json(), (req, res) => {
  const { session_id, role, content } = req.body as {
    session_id: string; role: string; content: string;
  };
  if (!role || !content) {
    res.status(400).json({ error: 'role and content are required' });
    return;
  }
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO conversations (id, book_id, session_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?, unixepoch())
  `).run(id, req.params.id, session_id ?? 'default', role, content);
  res.status(201).json({ id, ok: true });
});

// 获取该书的所有高亮
router.get('/:id/highlights', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM annotations WHERE book_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);
  res.json(rows);
});

// 存储一条高亮或笔记卡片
router.post('/:id/highlights', json(), (req, res) => {
  const { type, position, selected_text, color, note_content, chapter } = req.body as {
    type?: string; position: string; selected_text: string;
    color?: string; note_content?: string; chapter?: string;
  };
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO annotations (id, book_id, type, position, selected_text, color, note_content, chapter)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, req.params.id, type ?? 'highlight', position,
    selected_text, color ?? 'yellow', note_content ?? null, chapter ?? null
  );
  res.status(201).json({ id, ok: true });
});

export default router;
