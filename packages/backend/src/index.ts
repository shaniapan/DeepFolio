import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { runMigrations } from './db/migrate.js';
import booksRouter from './routes/books.js';
import progressRouter from './routes/progress.js';
import annotationsRouter from './routes/annotations.js';
import conversationsRouter from './routes/conversations.js';
import paragraphsRouter from './routes/paragraphs.js';
import settingsRouter from './routes/settings.js';
import aiRouter from './routes/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKS_DIR = path.resolve(__dirname, '../../../data/books');

const app = express();
const PORT = 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());
app.use('/files', express.static(BOOKS_DIR));

app.use('/api/books', booksRouter);
app.use('/api/books', progressRouter);
app.use('/api/books', annotationsRouter);
app.use('/api/books', conversationsRouter);
app.use('/api/books', paragraphsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/ai', aiRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

runMigrations();

app.listen(PORT, () => {
  console.log(`[Reader Backend] http://localhost:${PORT}`);
});
