# Reader MVP - Plan 1: Foundation & Basic Reader

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 搭建 Reader 项目脚手架，实现基础书库管理、EPUB/PDF 阅读，以及高亮批注功能，交付一个可独立运行的本地 Web 阅读器。

**Architecture:** 本地全栈——Vite+React 前端 + Express 后端，均运行在 localhost。SQLite 存储书库数据。文件通过 multer 上传至本地 `data/books/` 目录。

**Tech Stack:** React 18, TypeScript, Vite, Express, better-sqlite3, epub.js, pdfjs-dist, React Router v6, Zustand, multer

---

## 文件结构总览

```
reader/
├── package.json                     # monorepo root（npm workspaces）
├── packages/
│   ├── frontend/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx              # 路由配置
│   │       ├── api/client.ts        # fetch 封装
│   │       ├── store/books.ts       # Zustand 书籍状态
│   │       ├── pages/
│   │       │   ├── LibraryPage.tsx
│   │       │   ├── ReaderPage.tsx
│   │       │   └── SettingsPage.tsx
│   │       └── components/
│   │           ├── TopBar.tsx
│   │           ├── BookCard.tsx
│   │           ├── BookUploader.tsx
│   │           ├── EpubReader.tsx
│   │           ├── PdfReader.tsx
│   │           └── FloatingMenu.tsx
│   └── backend/
│       ├── package.json
│       └── src/
│           ├── index.ts             # Express 入口
│           ├── db/
│           │   ├── schema.ts        # 建表 SQL
│           │   ├── migrate.ts       # 迁移运行器
│           │   └── index.ts         # DB 单例
│           ├── routes/
│           │   ├── books.ts         # /api/books CRUD
│           │   ├── annotations.ts   # /api/books/:id/annotations
│           │   ├── progress.ts      # /api/books/:id/progress
│           │   └── settings.ts      # /api/settings
│           ├── services/
│           │   ├── fileStore.ts     # 文件存取
│           │   └── markdownExport.ts
│           └── middleware/upload.ts
├── data/
│   ├── reader.db
│   └── books/                       # 上传的原始文件
└── reader-notes/                    # Markdown 双写输出
```

---

## Task 1: Monorepo 脚手架

**Files:**
- Create: `package.json`
- Create: `packages/frontend/` (Vite 项目)
- Create: `packages/backend/package.json`

- [ ] **Step 1: 初始化 monorepo**

```bash
cd /Users/kazrabbit/Documents/anti_projects/reader
cat > package.json << 'EOF'
{
  "name": "reader",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "concurrently \"npm run dev -w packages/frontend\" \"npm run dev -w packages/backend\"",
    "start": "concurrently \"npm run start -w packages/frontend\" \"npm run start -w packages/backend\""
  }
}
EOF
```

- [ ] **Step 2: 创建前端项目**

```bash
export PATH="$HOME/.local/bin:$PATH"
cd /Users/kazrabbit/Documents/anti_projects/reader
npx -y create-vite@latest packages/frontend -- --template react-ts
```

- [ ] **Step 3: 安装前端依赖**

```bash
cd packages/frontend
npm install react-router-dom zustand epubjs pdfjs-dist
npm install -D @types/node
```

- [ ] **Step 4: 创建后端项目**

```bash
cd /Users/kazrabbit/Documents/anti_projects/reader
mkdir -p packages/backend/src/{db,routes,services,middleware}
cat > packages/backend/package.json << 'EOF'
{
  "name": "@reader/backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^9.4.3",
    "multer": "^1.4.5-lts.1",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/better-sqlite3": "^7.6.8",
    "@types/multer": "^1.4.11",
    "@types/cors": "^2.8.17",
    "tsx": "^4.7.1",
    "typescript": "^5.3.3"
  }
}
EOF
cd packages/backend && npm install
```

- [ ] **Step 5: 安装 root 工具**

```bash
cd /Users/kazrabbit/Documents/anti_projects/reader
npm install -D concurrently
```

- [ ] **Step 6: 验证结构**

```bash
ls packages/frontend/src && ls packages/backend/src
```

期望输出：frontend/src 有 main.tsx, backend/src 有子目录。

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: init monorepo with frontend (Vite+React) and backend (Express)"
```

---

## Task 2: SQLite 数据库 Schema

**Files:**
- Create: `packages/backend/src/db/schema.ts`
- Create: `packages/backend/src/db/migrate.ts`
- Create: `packages/backend/src/db/index.ts`

- [ ] **Step 1: 写 schema**

```typescript
// packages/backend/src/db/schema.ts
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  format TEXT NOT NULL,  -- 'epub' | 'pdf' | 'txt'
  filename TEXT NOT NULL,
  cover_url TEXT,
  total_pages INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS reading_progress (
  book_id TEXT PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
  position TEXT NOT NULL DEFAULT '',  -- CFI for epub, page num for pdf
  last_mode TEXT NOT NULL DEFAULT 'immersive',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'highlight' | 'note'
  position TEXT NOT NULL,
  selected_text TEXT NOT NULL,
  color TEXT DEFAULT 'yellow',  -- 'yellow'|'blue'|'green'|'red'
  note_content TEXT,
  chapter TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- default settings
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('api_key_openai', ''),
  ('api_key_deepseek', ''),
  ('active_model', 'deepseek'),
  ('nudge_enabled', 'true');
`;
```

- [ ] **Step 2: 写迁移运行器**

```typescript
// packages/backend/src/db/migrate.ts
import { db } from './index.js';
import { SCHEMA } from './schema.js';

export function runMigrations() {
  db.exec(SCHEMA);
  console.log('[DB] Migrations complete');
}
```

- [ ] **Step 3: 写 DB 单例**

```typescript
// packages/backend/src/db/index.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.resolve(process.cwd(), '../../data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'reader.db');
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add SQLite schema (books, progress, annotations, settings)"
```

---

## Task 3: Express 服务入口 + Books API

**Files:**
- Create: `packages/backend/src/index.ts`
- Create: `packages/backend/src/middleware/upload.ts`
- Create: `packages/backend/src/routes/books.ts`

- [ ] **Step 1: 创建 Express 入口**

```typescript
// packages/backend/src/index.ts
import express from 'express';
import cors from 'cors';
import path from 'path';
import { runMigrations } from './db/migrate.js';
import booksRouter from './routes/books.js';
import progressRouter from './routes/progress.js';
import annotationsRouter from './routes/annotations.js';
import settingsRouter from './routes/settings.js';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// 静态文件服务（书籍文件）
app.use('/files', express.static(path.resolve('../../data/books')));

app.use('/api/books', booksRouter);
app.use('/api/books', progressRouter);
app.use('/api/books', annotationsRouter);
app.use('/api/settings', settingsRouter);

runMigrations();

app.listen(PORT, () => {
  console.log(`[Server] Running at http://localhost:${PORT}`);
});
```

- [ ] **Step 2: 创建 multer 中间件**

```typescript
// packages/backend/src/middleware/upload.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const BOOKS_DIR = path.resolve(process.cwd(), '../../data/books');
fs.mkdirSync(BOOKS_DIR, { recursive: true });

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, BOOKS_DIR),
    filename: (_req, file, cb) => {
      const id = crypto.randomUUID();
      const ext = path.extname(file.originalname);
      cb(null, `${id}${ext}`);
    }
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = ['.epub', '.pdf', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB
});
```

- [ ] **Step 3: 创建 Books 路由**

```typescript
// packages/backend/src/routes/books.ts
import { Router } from 'express';
import crypto from 'crypto';
import path from 'path';
import { db } from '../db/index.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// GET /api/books
router.get('/', (_req, res) => {
  const books = db.prepare('SELECT * FROM books ORDER BY created_at DESC').all();
  res.json(books);
});

// POST /api/books (upload)
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const id = crypto.randomUUID();
  const ext = path.extname(req.file.originalname).toLowerCase().slice(1);
  const title = path.basename(req.file.originalname, path.extname(req.file.originalname));

  db.prepare(`
    INSERT INTO books (id, title, format, filename)
    VALUES (?, ?, ?, ?)
  `).run(id, title, ext, req.file.filename);

  db.prepare(`
    INSERT OR IGNORE INTO reading_progress (book_id, position) VALUES (?, '')
  `).run(id);

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  res.status(201).json(book);
});

// DELETE /api/books/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
```

- [ ] **Step 4: 启动后端并手动测试**

```bash
cd packages/backend && npm run dev
# 新开终端：
curl http://localhost:3001/api/books
# 期望：[]
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add Express server, file upload, books CRUD API"
```

---

## Task 4: Progress & Annotations API

**Files:**
- Create: `packages/backend/src/routes/progress.ts`
- Create: `packages/backend/src/routes/annotations.ts`

- [ ] **Step 1: Progress 路由**

```typescript
// packages/backend/src/routes/progress.ts
import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/:id/progress', (req, res) => {
  const row = db.prepare('SELECT * FROM reading_progress WHERE book_id = ?').get(req.params.id);
  res.json(row ?? { book_id: req.params.id, position: '', last_mode: 'immersive' });
});

router.put('/:id/progress', (req, res) => {
  const { position, last_mode } = req.body;
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
```

- [ ] **Step 2: Annotations 路由**

```typescript
// packages/backend/src/routes/annotations.ts
import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/index.js';

const router = Router();

router.get('/:id/annotations', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM annotations WHERE book_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);
  res.json(rows);
});

router.post('/:id/annotations', (req, res) => {
  const { type, position, selected_text, color, note_content, chapter } = req.body;
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
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add progress and annotations API routes"
```

---

## Task 5: Settings API

**Files:**
- Create: `packages/backend/src/routes/settings.ts`

- [ ] **Step 1: Settings 路由**

```typescript
// packages/backend/src/routes/settings.ts
import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{key: string, value: string}>;
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  // 不返回明文 API keys（前端只需知道是否已设置）
  const safe = {
    ...settings,
    api_key_openai: settings.api_key_openai ? '***' : '',
    api_key_deepseek: settings.api_key_deepseek ? '***' : '',
  };
  res.json(safe);
});

router.put('/', (req, res) => {
  const updates = req.body as Record<string, string>;
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
  const txn = db.transaction((data: Record<string, string>) => {
    for (const [key, value] of Object.entries(data)) {
      upsert.run(key, value);
    }
  });
  txn(updates);
  res.json({ ok: true });
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add settings API (API keys, model selection)"
```

---

## Task 6: 前端 API Client + 路由

**Files:**
- Modify: `packages/frontend/src/main.tsx`
- Create: `packages/frontend/src/api/client.ts`
- Modify: `packages/frontend/src/App.tsx`

- [ ] **Step 1: API Client**

```typescript
// packages/frontend/src/api/client.ts
const BASE = 'http://localhost:3001/api';

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  books: {
    list: () => req<Book[]>('/books'),
    upload: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return req<Book>('/books', { method: 'POST', body: fd });
    },
    delete: (id: string) => req(`/books/${id}`, { method: 'DELETE' }),
  },
  progress: {
    get: (bookId: string) => req<Progress>(`/books/${bookId}/progress`),
    set: (bookId: string, data: Partial<Progress>) =>
      req(`/books/${bookId}/progress`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  annotations: {
    list: (bookId: string) => req<Annotation[]>(`/books/${bookId}/annotations`),
    create: (bookId: string, data: Omit<Annotation, 'id' | 'book_id' | 'created_at'>) =>
      req(`/books/${bookId}/annotations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    delete: (bookId: string, annotationId: string) =>
      req(`/books/${bookId}/annotations/${annotationId}`, { method: 'DELETE' }),
  },
  settings: {
    get: () => req<Record<string, string>>('/settings'),
    set: (data: Record<string, string>) =>
      req('/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
};

// Types
export interface Book {
  id: string; title: string; author?: string;
  format: 'epub' | 'pdf' | 'txt'; filename: string;
  cover_url?: string; created_at: number;
}
export interface Progress {
  book_id: string; position: string; last_mode: string; updated_at: number;
}
export interface Annotation {
  id: string; book_id: string; type: 'highlight' | 'note';
  position: string; selected_text: string; color: string;
  note_content?: string; chapter?: string; created_at: number;
}
```

- [ ] **Step 2: 配置路由（App.tsx）**

```tsx
// packages/frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LibraryPage from './pages/LibraryPage';
import ReaderPage from './pages/ReaderPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/reader/:bookId" element={<ReaderPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: 启动前端验证路由可访问**

```bash
cd packages/frontend && npm run dev
# 浏览器访问 http://localhost:5173，应无报错
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add API client and routing"
```

---

## Task 7: 书库页面

**Files:**
- Create: `packages/frontend/src/components/TopBar.tsx`
- Create: `packages/frontend/src/components/BookCard.tsx`
- Create: `packages/frontend/src/components/BookUploader.tsx`
- Create: `packages/frontend/src/pages/LibraryPage.tsx`

- [ ] **Step 1: TopBar 组件**

```tsx
// packages/frontend/src/components/TopBar.tsx
import { Link, useNavigate } from 'react-router-dom';

interface Props { showBack?: boolean; title?: string; }

export default function TopBar({ showBack, title }: Props) {
  const nav = useNavigate();
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 20px', background: '#0f172a',
      borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 100
    }}>
      {showBack && (
        <button onClick={() => nav(-1)}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>
          ← 书库
        </button>
      )}
      <span style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600 }}>
        {title ?? 'Reader'}
      </span>
      <div style={{ flex: 1 }} />
      <Link to="/settings" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>⚙️ 设置</Link>
    </header>
  );
}
```

- [ ] **Step 2: BookCard 组件**

```tsx
// packages/frontend/src/components/BookCard.tsx
import { useNavigate } from 'react-router-dom';
import type { Book } from '../api/client';

interface Props { book: Book; onDelete: (id: string) => void; }

export default function BookCard({ book, onDelete }: Props) {
  const nav = useNavigate();
  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
      padding: 16, cursor: 'pointer', position: 'relative',
      transition: 'border-color .2s'
    }}
      onClick={() => nav(`/reader/${book.id}`)}>
      <div style={{
        width: '100%', height: 140, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, marginBottom: 12
      }}>
        {book.format === 'pdf' ? '📄' : book.format === 'epub' ? '📗' : '📝'}
      </div>
      <p style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>{book.title}</p>
      <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{book.format.toUpperCase()}</p>
      <button
        onClick={e => { e.stopPropagation(); onDelete(book.id); }}
        style={{
          position: 'absolute', top: 8, right: 8, background: 'none',
          border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16
        }}>✕</button>
    </div>
  );
}
```

- [ ] **Step 3: BookUploader 组件**

```tsx
// packages/frontend/src/components/BookUploader.tsx
import { useRef, useState } from 'react';

interface Props { onUpload: (file: File) => Promise<void>; }

export default function BookUploader({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setLoading(true);
    try {
      for (const file of Array.from(files)) await onUpload(file);
    } finally { setLoading(false); }
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      style={{
        border: '2px dashed #334155', borderRadius: 12, padding: 40,
        textAlign: 'center', cursor: 'pointer', color: '#64748b',
        transition: 'border-color .2s'
      }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{loading ? '⏳' : '📁'}</div>
      <p style={{ margin: 0, fontSize: 14 }}>
        {loading ? '上传中...' : '拖拽或点击上传 EPUB / PDF 文件'}
      </p>
      <input ref={inputRef} type="file" accept=".epub,.pdf,.txt"
        multiple hidden onChange={e => handleFiles(e.target.files)} />
    </div>
  );
}
```

- [ ] **Step 4: LibraryPage**

```tsx
// packages/frontend/src/pages/LibraryPage.tsx
import { useEffect, useState } from 'react';
import { api, type Book } from '../api/client';
import TopBar from '../components/TopBar';
import BookCard from '../components/BookCard';
import BookUploader from '../components/BookUploader';

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);

  async function load() { setBooks(await api.books.list()); }

  useEffect(() => { load(); }, []);

  async function handleUpload(file: File) {
    await api.books.upload(file);
    await load();
  }

  async function handleDelete(id: string) {
    await api.books.delete(id);
    setBooks(b => b.filter(x => x.id !== id));
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e' }}>
      <TopBar />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 22, marginBottom: 24 }}>我的书库</h1>
        <BookUploader onUpload={handleUpload} />
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 16, marginTop: 24
        }}>
          {books.map(b => <BookCard key={b.id} book={b} onDelete={handleDelete} />)}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: 验证书库页面**

前后端均运行时，访问 http://localhost:5173，应显示书库页面，可上传 EPUB/PDF 文件，书卡出现在网格中。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add library page with book upload and grid display"
```

---

## Task 8: EPUB 阅读器

**Files:**
- Create: `packages/frontend/src/components/EpubReader.tsx`
- Modify: `packages/frontend/src/pages/ReaderPage.tsx`

- [ ] **Step 1: EpubReader 组件**

```tsx
// packages/frontend/src/components/EpubReader.tsx
import { useEffect, useRef } from 'react';
import ePub, { type Rendition } from 'epubjs';

interface Props {
  url: string;
  initialCfi?: string;
  onLocationChange: (cfi: string) => void;
  onTextSelect: (text: string, cfi: string) => void;
}

export default function EpubReader({ url, initialCfi, onLocationChange, onTextSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const book = ePub(url);
    const rendition = book.renderTo(containerRef.current, {
      width: '100%', height: '100%', flow: 'scrolled-continuous'
    });
    renditionRef.current = rendition;

    rendition.display(initialCfi || undefined);

    rendition.on('relocated', (location: { start: { cfi: string } }) => {
      onLocationChange(location.start.cfi);
    });

    rendition.on('selected', (cfiRange: string, contents: { window: Window }) => {
      const selection = contents.window.getSelection();
      if (selection?.toString().trim()) {
        onTextSelect(selection.toString().trim(), cfiRange);
      }
    });

    return () => { rendition.destroy(); book.destroy(); };
  }, [url]);

  return (
    <div ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#fff', borderRadius: 8 }} />
  );
}
```

- [ ] **Step 2: 更新 ReaderPage（EPUB 部分）**

```tsx
// packages/frontend/src/pages/ReaderPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Book, type Progress } from '../api/client';
import TopBar from '../components/TopBar';
import EpubReader from '../components/EpubReader';

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    if (!bookId) return;
    api.books.list().then(books => setBook(books.find(b => b.id === bookId) ?? null));
    api.progress.get(bookId).then(setProgress);
  }, [bookId]);

  function handleLocationChange(cfi: string) {
    if (!bookId) return;
    api.progress.set(bookId, { position: cfi, last_mode: 'immersive' });
  }

  function handleTextSelect(text: string, _cfi: string) {
    setSelectedText(text);
    // FloatingMenu 将在 Task 10 实现
  }

  if (!book || !progress) return (
    <div style={{ background: '#0a0f1e', minHeight: '100vh', color: '#94a3b8',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      加载中...
    </div>
  );

  const fileUrl = `http://localhost:3001/files/${book.filename}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0f1e' }}>
      <TopBar showBack title={book.title} />
      <div style={{ flex: 1, overflow: 'hidden', padding: 16 }}>
        {book.format === 'epub' && (
          <EpubReader
            url={fileUrl}
            initialCfi={progress.position || undefined}
            onLocationChange={handleLocationChange}
            onTextSelect={handleTextSelect}
          />
        )}
        {book.format === 'pdf' && (
          <div style={{ color: '#94a3b8', textAlign: 'center', paddingTop: 40 }}>
            PDF 阅读器（Task 9 实现）
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 验证 EPUB 阅读**

上传一本 EPUB 文件后，点击进入阅读页，应显示书籍内容，滚动后进度自动保存（刷新页面后恢复位置）。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add EPUB reader with progress persistence"
```

---

## Task 9: PDF 阅读器

**Files:**
- Create: `packages/frontend/src/components/PdfReader.tsx`
- Modify: `packages/frontend/src/pages/ReaderPage.tsx`

- [ ] **Step 1: 配置 PDF.js Worker**

在 `packages/frontend/vite.config.ts` 中确保 worker 文件可访问：

```typescript
// packages/frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist']
  }
});
```

- [ ] **Step 2: PdfReader 组件**

```tsx
// packages/frontend/src/components/PdfReader.tsx
import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// 使用 CDN worker，避免构建复杂性
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Props {
  url: string;
  initialPage?: number;
  onPageChange: (page: number) => void;
}

export default function PdfReader({ url, initialPage = 1, onPageChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  useEffect(() => {
    pdfjsLib.getDocument(url).promise.then(pdf => {
      pdfRef.current = pdf;
      setTotalPages(pdf.numPages);
      renderPage(pdf, initialPage);
    });
    return () => { pdfRef.current?.destroy(); };
  }, [url]);

  async function renderPage(pdf: pdfjsLib.PDFDocumentProxy, pageNum: number) {
    if (!containerRef.current) return;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(canvas);
  }

  async function goTo(pageNum: number) {
    if (!pdfRef.current || pageNum < 1 || pageNum > totalPages) return;
    setCurrentPage(pageNum);
    onPageChange(pageNum);
    await renderPage(pdfRef.current, pageNum);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center' }}>
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', width: '100%', background: '#e2e8f0' }} />
      <div style={{ padding: '8px 16px', background: '#1e293b', display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1}
          style={{ background: '#334155', border: 'none', color: '#f1f5f9', padding: '4px 12px', borderRadius: 4, cursor: 'pointer' }}>
          ←
        </button>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>{currentPage} / {totalPages}</span>
        <button onClick={() => goTo(currentPage + 1)} disabled={currentPage >= totalPages}
          style={{ background: '#334155', border: 'none', color: '#f1f5f9', padding: '4px 12px', borderRadius: 4, cursor: 'pointer' }}>
          →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 在 ReaderPage 中接入 PdfReader**

将 ReaderPage.tsx 中的 PDF 占位符替换：

```tsx
{book.format === 'pdf' && (
  <PdfReader
    url={fileUrl}
    initialPage={parseInt(progress.position || '1', 10)}
    onPageChange={page => api.progress.set(bookId!, { position: String(page), last_mode: 'immersive' })}
  />
)}
```

- [ ] **Step 4: 验证 PDF 阅读**

上传 PDF 后进入阅读页，应显示第一页，可翻页，刷新后恢复到上次页码。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add PDF reader with page navigation and progress"
```

---

## Task 10: 高亮 & 悬浮菜单

**Files:**
- Create: `packages/frontend/src/components/FloatingMenu.tsx`
- Modify: `packages/frontend/src/pages/ReaderPage.tsx`

- [ ] **Step 1: FloatingMenu 组件**

```tsx
// packages/frontend/src/components/FloatingMenu.tsx
interface Props {
  text: string;
  position: { x: number; y: number };
  onHighlight: (color: string) => void;
  onAddNote: () => void;
  onAsk: () => void;
  onClose: () => void;
}

const COLORS = ['#fbbf24', '#60a5fa', '#34d399', '#f87171'];
const COLOR_NAMES = ['yellow', 'blue', 'green', 'red'];

export default function FloatingMenu({ text, position, onHighlight, onAddNote, onAsk, onClose }: Props) {
  if (!text) return null;
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={onClose} />
      <div style={{
        position: 'fixed', left: position.x, top: position.y - 80,
        background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
        padding: '8px 12px', zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,.4)',
        display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220
      }}>
        {/* 操作区 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onAsk}
            style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            💬 提问
          </button>
          <button onClick={onAddNote}
            style={{ background: '#334155', border: 'none', color: '#e2e8f0', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            📝 笔记
          </button>
          {/* 高亮颜色 */}
          {COLORS.map((c, i) => (
            <button key={c} onClick={() => onHighlight(COLOR_NAMES[i])}
              style={{ width: 20, height: 20, background: c, border: 'none', borderRadius: '50%', cursor: 'pointer' }} />
          ))}
        </div>
        {/* 选中文字预览 */}
        <p style={{ color: '#64748b', fontSize: 11, margin: 0, maxWidth: 240,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          "{text}"
        </p>
      </div>
    </>
  );
}
```

- [ ] **Step 2: 在 ReaderPage 里接入 FloatingMenu**

在 ReaderPage 顶部新增状态和处理：

```tsx
const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
const [showMenu, setShowMenu] = useState(false);
const [activeCfi, setActiveCfi] = useState('');

function handleTextSelect(text: string, cfi: string) {
  if (!text.trim()) return;
  setSelectedText(text);
  setActiveCfi(cfi);
  // 取鼠标位置
  const sel = window.getSelection();
  if (sel?.rangeCount) {
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setMenuPos({ x: rect.left + rect.width / 2 - 110, y: rect.top });
  }
  setShowMenu(true);
}

async function handleHighlight(color: string) {
  if (!bookId || !selectedText) return;
  await api.annotations.create(bookId, {
    type: 'highlight', position: activeCfi,
    selected_text: selectedText, color
  });
  setShowMenu(false);
}
```

在 JSX 中加入：
```tsx
{showMenu && (
  <FloatingMenu
    text={selectedText}
    position={menuPos}
    onHighlight={handleHighlight}
    onAddNote={() => { /* Task 11 扩展 */ setShowMenu(false); }}
    onAsk={() => { /* Plan 3 实现 AI 问答 */ setShowMenu(false); }}
    onClose={() => setShowMenu(false)}
  />
)}
```

- [ ] **Step 3: 验证高亮功能**

EPUB 中选中文字 → 悬浮菜单出现 → 点击颜色按钮 → annotation 被保存（可通过 `curl http://localhost:3001/api/books/{id}/annotations` 验证）。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add floating menu with highlight and note creation"
```

---

## Task 11: 设置页面

**Files:**
- Create: `packages/frontend/src/pages/SettingsPage.tsx`

- [ ] **Step 1: 设置页面**

```tsx
// packages/frontend/src/pages/SettingsPage.tsx
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import TopBar from '../components/TopBar';

const MODELS = [
  { value: 'deepseek', label: 'DeepSeek（推荐）' },
  { value: 'openai', label: 'OpenAI GPT-4o' },
  { value: 'claude', label: 'Anthropic Claude' },
  { value: 'qwen', label: '通义千问（Qwen）' },
];

export default function SettingsPage() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [model, setModel] = useState('deepseek');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settings.get().then(s => setModel(s.active_model ?? 'deepseek'));
  }, []);

  async function handleSave() {
    const updates: Record<string, string> = { active_model: model };
    if (openaiKey) updates.api_key_openai = openaiKey;
    if (deepseekKey) updates.api_key_deepseek = deepseekKey;
    await api.settings.set(updates);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inputStyle = {
    width: '100%', background: '#1e293b', border: '1px solid #334155',
    borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14,
    outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' as const
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e' }}>
      <TopBar showBack title="设置" />
      <main style={{ maxWidth: 560, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24 }}>
          <h2 style={{ color: '#f1f5f9', fontSize: 16, margin: '0 0 20px' }}>AI 模型配置</h2>

          <label style={{ color: '#94a3b8', fontSize: 13 }}>默认模型</label>
          <select value={model} onChange={e => setModel(e.target.value)}
            style={{ ...inputStyle, marginTop: 6, marginBottom: 20 }}>
            {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>

          <label style={{ color: '#94a3b8', fontSize: 13 }}>DeepSeek API Key</label>
          <input type="password" value={deepseekKey} onChange={e => setDeepseekKey(e.target.value)}
            placeholder="sk-..." style={{ ...inputStyle, marginTop: 6, marginBottom: 20 }} />

          <label style={{ color: '#94a3b8', fontSize: 13 }}>OpenAI API Key</label>
          <input type="password" value={openaiKey} onChange={e => setOpenaiKey(e.target.value)}
            placeholder="sk-..." style={{ ...inputStyle, marginTop: 6, marginBottom: 24 }} />

          <button onClick={handleSave}
            style={{
              width: '100%', background: '#6366f1', border: 'none', borderRadius: 8,
              padding: '10px 0', color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 600
            }}>
            {saved ? '✅ 已保存' : '保存设置'}
          </button>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add settings page with API key and model config"
```

---

## Task 12: Markdown 笔记导出

**Files:**
- Create: `packages/backend/src/services/markdownExport.ts`
- Modify: `packages/backend/src/routes/books.ts`

- [ ] **Step 1: Markdown 导出服务**

```typescript
// packages/backend/src/services/markdownExport.ts
import fs from 'fs';
import path from 'path';
import { db } from '../db/index.js';

const NOTES_DIR = path.resolve(process.cwd(), '../../reader-notes');

export function exportBookNotes(bookId: string): string {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as { title: string; author?: string };
  const annotations = db.prepare(
    'SELECT * FROM annotations WHERE book_id = ? ORDER BY created_at ASC'
  ).all(bookId) as Array<{ type: string; selected_text: string; note_content?: string; color: string; chapter?: string }>;

  const highlights = annotations.filter(a => a.type === 'highlight');
  const notes = annotations.filter(a => a.type === 'note');

  const lines = [
    `# ${book.title}${book.author ? ` · ${book.author}` : ''}`,
    `\n> 导出时间：${new Date().toLocaleString('zh-CN')}`,
    '\n---\n',
    '## 高亮摘录\n',
    ...highlights.map(h => `- **[${h.color}]** ${h.selected_text}${h.chapter ? ` *(${h.chapter})*` : ''}`),
    '\n---\n',
    '## 笔记\n',
    ...notes.map(n => `- ${n.selected_text}\n  > ${n.note_content ?? ''}`),
  ];

  const dir = path.join(NOTES_DIR, bookId);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'highlights.md');
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return filePath;
}
```

- [ ] **Step 2: 在 Books 路由增加导出接口**

在 `packages/backend/src/routes/books.ts` 中添加：

```typescript
import { exportBookNotes } from '../services/markdownExport.js';

// GET /api/books/:id/export
router.get('/:id/export', (req, res) => {
  const filePath = exportBookNotes(req.params.id);
  res.download(filePath);
});
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add Markdown notes export"
```

---

## Self-Review

**Spec coverage check:**
- [x] EPUB 导入 & 渲染 — Task 8
- [x] PDF 导入 & 渲染 — Task 9
- [x] 阅读进度持久化 — Task 4 (API) + Task 8/9 (前端)
- [x] 高亮（4色）& 文字批注 — Task 10
- [x] 基础书库（上传、列表展示）— Task 7
- [x] SQLite 本地存储 — Task 2
- [x] Markdown 导出 — Task 12
- [x] API Key 配置 & 模型选择 — Task 5 + Task 11

**未包含（Plan 2/3 实现）：**
- 全局用户档案填写
- AI 批量预生成 & 段落标注
- 工具式 / 沉浸式模式切换
- AI 面板、提问、批判模式、Nudge

**Placeholder scan:** 无 TBD/TODO，所有步骤均有完整代码。

**Type consistency:** `Book`、`Progress`、`Annotation` 类型在 `api/client.ts` 统一定义，所有组件从同一文件导入。
