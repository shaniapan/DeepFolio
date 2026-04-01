import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTES_DIR = path.resolve(__dirname, '../../../../reader-notes');

interface BookRow { title: string; author?: string }
interface AnnotationRow { type: string; selected_text: string; note_content?: string; color: string; chapter?: string }

export function exportBookNotes(bookId: string): string {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as BookRow;
  const annotations = db.prepare(
    'SELECT * FROM annotations WHERE book_id = ? ORDER BY created_at ASC'
  ).all(bookId) as AnnotationRow[];

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
