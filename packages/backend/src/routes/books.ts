import { Router } from 'express';
import crypto from 'crypto';
import path from 'path';
import { db } from '../db/index.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.get('/', (_req, res) => {
  const books = db.prepare('SELECT * FROM books ORDER BY created_at DESC').all();
  res.json(books);
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const id = crypto.randomUUID();
  const ext = path.extname(req.file.originalname).toLowerCase().slice(1);
  const title = path.basename(req.file.originalname, path.extname(req.file.originalname));

  db.prepare('INSERT INTO books (id, title, format, filename) VALUES (?, ?, ?, ?)')
    .run(id, title, ext, req.file.filename);
  db.prepare('INSERT OR IGNORE INTO reading_progress (book_id, position) VALUES (?, \'\')')
    .run(id);

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  res.status(201).json(book);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
