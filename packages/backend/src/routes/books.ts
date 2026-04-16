import { Router, json } from 'express';
import fs from 'fs';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import crypto from 'crypto';
import path from 'path';
import { db } from '../db/index.js';
import { upload } from '../middleware/upload.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const router = Router();

router.get('/', (_req, res) => {
  const books = db.prepare('SELECT * FROM books ORDER BY created_at DESC').all();
  res.json(books);
});

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const id = crypto.randomUUID();
  // 修复 multer 中文文件名乱码问题 (latin1 -> utf8)
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  
  const ext = path.extname(originalName).toLowerCase().slice(1);
  const title = path.basename(originalName, path.extname(originalName));

  let hasTextLayer = 1;
  if (ext === 'pdf' && req.file.path) {
    try {
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdfParse(dataBuffer, { max: 3 }); 
      if (data.text.trim().length < 50) {
         hasTextLayer = 0;
      }
    } catch (e) {
      console.error('pdf-parse check error', e);
    }
  }

  db.prepare('INSERT INTO books (id, title, format, filename, has_text_layer) VALUES (?, ?, ?, ?, ?)')
    .run(id, title, ext, req.file.filename, hasTextLayer);
  db.prepare('INSERT OR IGNORE INTO reading_progress (book_id, position) VALUES (?, \'\')')
    .run(id);

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  res.status(201).json(book);
});

router.post('/url', json(), async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: 'URL is required' });
    return;
  }

  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const htmlText = await response.text();

    const doc = new JSDOM(htmlText, { url });
    const document = doc.window.document;

    // 预处理 1: 解决图片懒加载 (如微信公众号的 data-src)
    document.querySelectorAll('img').forEach(img => {
      const dataSrc = img.getAttribute('data-src');
      if (dataSrc) img.setAttribute('src', dataSrc);
    });

    let articleContent = '';
    let title = document.title || 'Untitled Article';

    // 智能提取分支：如果是微信公众号文章，直接提取高保真容器，放弃 Readability 的破坏性清洗
    const wxNode = document.querySelector('#js_content');
    if (wxNode) {
      wxNode.removeAttribute('style'); // 去除 visibility: hidden
      articleContent = wxNode.innerHTML;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) title = ogTitle.getAttribute('content') || title;
    } else {
      // 预处理 2: 对于普通抓取，移除所有内联隐藏样式防止 Readability 误判抛弃正文
      document.querySelectorAll('[style]').forEach(el => {
        if (el.getAttribute('style')?.includes('hidden') || el.getAttribute('style')?.includes('none')) {
           el.removeAttribute('style');
        }
      });
      const reader = new Readability(document);
      const article = reader.parse();
      if (!article) throw new Error('Could not extract main content');
      articleContent = article.content ?? '';
      if (article.title) title = article.title;
    }

    const id = crypto.randomUUID();
    const filename = `${id}.html`;
    
    // 增加 meta referrer 策略，绕过防盗链
    const htmlTemplate = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>${title}</title><style>body{font-family:system-ui,sans-serif;line-height:1.6;font-size:16px} img{max-width:100%;height:auto;}</style></head><body><h1 style="text-align:center;margin-bottom:30px;">${title}</h1>${articleContent}</body></html>`;

    const __dirnameBooks = path.dirname(new URL(import.meta.url).pathname);
    const BOOKS_DIR = path.resolve(__dirnameBooks, '../../../../data/books');
    if (!fs.existsSync(BOOKS_DIR)) fs.mkdirSync(BOOKS_DIR, { recursive: true });

    fs.writeFileSync(path.join(BOOKS_DIR, filename), htmlTemplate);

    db.prepare('INSERT INTO books (id, title, format, filename) VALUES (?, ?, ?, ?)').run(id, title, 'html', filename);
    db.prepare('INSERT OR IGNORE INTO reading_progress (book_id, position) VALUES (?, \'\')').run(id);

    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    res.status(201).json(book);
  } catch (err: any) {
    console.error('URL extraction failed:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

