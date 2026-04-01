import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/:id/progress', (req, res) => {
  const row = db.prepare('SELECT * FROM reading_progress WHERE book_id = ?').get(req.params.id);
  res.json(row ?? { book_id: req.params.id, position: '', last_mode: 'immersive' });
});

router.put('/:id/progress', (req, res) => {
  const { position, last_mode } = req.body as { position?: string; last_mode?: string };
  db.prepare(`
    INSERT INTO reading_progress (book_id, position, last_mode, updated_at)
    VALUES (?, ?, ?, unixepoch())
    ON CONFLICT(book_id) DO UPDATE SET
      position = excluded.position,
      last_mode = excluded.last_mode,
      updated_at = excluded.updated_at
  `).run(req.params.id, position ?? '', last_mode ?? 'immersive');
  res.json({ ok: true });
});

export default router;
