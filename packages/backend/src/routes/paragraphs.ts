/**
 * 段落角标路由
 * - GET  /:id/paragraphs  — 查询预生成的角标列表
 * - POST /:id/paragraphs/generate — 手动触发预生成（返回立即，后台运行）
 */
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db/index.js';
import { generateGlobalSummary, preGenerateParagraphAnnotations } from '../services/preGenerator.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKS_DIR = path.resolve(__dirname, '../../../../data/books');

// 获取该书的角标列表
router.get('/:id/paragraphs', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM paragraph_annotations WHERE book_id = ? ORDER BY paragraph_index ASC'
  ).all(req.params.id);
  res.json(rows);
});

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// 分支处理不同格式的纯文本提取
async function extractTextFromFile(filePath: string, format: string): Promise<string> {
  if (format === 'pdf') {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text || '';
    } catch (e) {
      console.error('pdf-parse extract error for pregen:', e);
      return '';
    }
  } else if (format === 'epub') {
    // 暂不支持 epub 服务端全文本析构
    console.log('[Pregen] Skipping full-text extraction for epub in backend.');
    return '';
  } else {
    return fs.readFileSync(filePath, 'utf-8');
  }
}

// 触发预生成（异步，不阻塞响应）
router.post('/:id/paragraphs/generate', (req, res) => {
  const bookId = req.params.id;
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId) as { filename: string, format: string } | undefined;
  if (!book) { res.status(404).json({ error: 'Book not found' }); return; }

  const { progress = 0 } = req.body || {};

  // 读取文件内容
  const filePath = path.join(BOOKS_DIR, book.filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Book file not found' });
    return;
  }

  // 立即返回，在后台异步运行双轨引擎
  res.json({ ok: true, status: 'generating' });
  
  extractTextFromFile(filePath, book.format).then(textContent => {
    if (!textContent || textContent.trim().length === 0) return;
    
    // Track 1: 全局提要（内部实现有幂等锁，已有摘要会秒退）
    generateGlobalSummary(bookId, textContent).catch(console.error);

    // Track 2: 渐进式角标提取（按滚动进度锁定窗口）
    preGenerateParagraphAnnotations(bookId, textContent, Number(progress)).catch(console.error);
  }).catch(console.error);
});

export default router;
