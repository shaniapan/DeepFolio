import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json({
    ...settings,
    api_key_openai: settings.api_key_openai ? '***' : '',
    api_key_deepseek: settings.api_key_deepseek ? '***' : '',
  });
});

router.put('/', (req, res) => {
  const updates = req.body as Record<string, string>;
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const txn = db.transaction((data: Record<string, string>) => {
    for (const [key, value] of Object.entries(data)) upsert.run(key, value);
  });
  txn(updates);
  res.json({ ok: true });
});

export default router;
