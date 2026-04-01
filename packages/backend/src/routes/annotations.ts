import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/index.js';

const router = Router();

import { exportBookNotes } from '../services/markdownExport.js';

router.get('/:id/annotations', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM annotations WHERE book_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);
  res.json(rows);
});

router.post('/:id/export', (req, res) => {
  try {
    const filePath = exportBookNotes(req.params.id);
    res.json({ ok: true, file: filePath });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/annotations', (req, res) => {
  const { type, position, selected_text, color, note_content, chapter } = req.body as {
    type: string; position: string; selected_text: string;
    color?: string; note_content?: string; chapter?: string;
  };
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO annotations (id, book_id, type, position, selected_text, color, note_content, chapter)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.id, type, position, selected_text, color ?? 'yellow', note_content ?? null, chapter ?? null);
  res.status(201).json({ id, ok: true });
});

router.delete('/:bookId/annotations/:annotationId', (req, res) => {
  db.prepare('DELETE FROM annotations WHERE id = ? AND book_id = ?')
    .run(req.params.annotationId, req.params.bookId);
  res.json({ ok: true });
});

export default router;
