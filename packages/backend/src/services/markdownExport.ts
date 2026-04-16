import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NOTES_DIR = path.resolve(__dirname, '../../../../reader-notes');

interface BookRow { id: string; title: string; author?: string }
interface AnnotationRow { type: string; selected_text: string; note_content?: string; color: string; chapter?: string; created_at: number }
interface ConversationRow { role: string; content: string; created_at: number }

export function exportBookNotes(bookId: string): string {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as BookRow;
  const annotations = db.prepare(
    'SELECT * FROM annotations WHERE book_id = ? ORDER BY created_at ASC'
  ).all(bookId) as AnnotationRow[];
  const conversations = db.prepare(
    'SELECT * FROM conversations WHERE book_id = ? ORDER BY created_at ASC'
  ).all(bookId) as ConversationRow[];

  const highlights = annotations.filter(a => a.type === 'highlight');
  const aiNotes = annotations.filter(a => a.type === 'note');

  const fmt = (ts: number) => new Date(ts * 1000).toLocaleString('zh-CN');

  const lines: string[] = [
    `# ${book.title}${book.author ? ` · ${book.author}` : ''}`,
    `\n> 导出时间：${new Date().toLocaleString('zh-CN')}\n`,
    '---\n',
  ];

  if (highlights.length > 0) {
    lines.push('## 📌 高亮摘录\n');
    highlights.forEach(h => {
      const colorEmoji: Record<string, string> = { yellow: '🟡', blue: '🔵', green: '🟢', red: '🔴' };
      lines.push(`> ${colorEmoji[h.color] ?? '📌'} ${h.selected_text}`);
      if (h.chapter) lines.push(`> \n> *(${h.chapter})*`);
      lines.push('');
    });
    lines.push('---\n');
  }

  if (aiNotes.length > 0) {
    lines.push('## 🌟 AI 知识卡片\n');
    aiNotes.forEach(n => {
      lines.push(`**原文摘录**：${n.selected_text}\n`);
      lines.push(`**AI 分析**：\n${n.note_content ?? ''}\n`);
      lines.push('---\n');
    });
  }

  if (conversations.length > 0) {
    lines.push('## 💬 AI 对话记录\n');
    for (const msg of conversations) {
      const prefix = msg.role === 'user' ? '**🙋 我**' : '**🤖 AI**';
      lines.push(`${prefix}（${fmt(msg.created_at)}）\n`);
      lines.push(msg.content);
      lines.push('');
    }
  }

  const safeTitle = book.title.replace(/[/\\?%*:|"<>]/g, '-');
  const dir = path.join(NOTES_DIR, safeTitle);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, 'knowledge-notes.md');
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  return filePath;
}
