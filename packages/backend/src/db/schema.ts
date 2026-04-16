// packages/backend/src/db/schema.ts
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT,
  format TEXT NOT NULL,
  filename TEXT NOT NULL,
  summary TEXT,
  cover_url TEXT,
  total_pages INTEGER,
  has_text_layer INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS reading_progress (
  book_id TEXT PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
  position TEXT NOT NULL DEFAULT '',
  last_mode TEXT NOT NULL DEFAULT 'immersive',
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  position TEXT NOT NULL,
  selected_text TEXT NOT NULL,
  color TEXT DEFAULT 'yellow',
  note_content TEXT,
  chapter TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS knowledge_cards (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  concept TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_quote TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS paragraph_annotations (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  paragraph_index INTEGER NOT NULL,
  paragraph_text TEXT NOT NULL,
  type TEXT NOT NULL,  -- KEY | HARD | LINK | BRIDGE
  insight TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('api_key_openai', ''),
  ('api_key_deepseek', ''),
  ('active_model', 'qwen'),
  ('nudge_enabled', 'true');
`;
