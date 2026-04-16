/**
 * 段落预生成引擎 (Paragraph Pre-generation Engine)
 * 
 * 首次打开一本书时，在后台异步扫描全文，
 * 用 AI 对关键段落打上 🔑❓💡🌉 标记，存入 paragraph_annotations 表。
 * 前端轮询 /api/books/:id/paragraphs 来读取结果并展示角标。
 */

import { callAI, type AIModel } from './ai/adapter.js';
import { db } from '../db/index.js';
import crypto from 'crypto';

interface BookRow { id: string; title: string; filename: string; summary?: string }
interface SettingsRow { key: string; value: string }

// 块尺寸：每次滑动预处理多少段落
const CHUNK_SIZE = 40;
// 标签最大密度控制
const MARK_RATIO = 0.2;
// 全览保护机制：最大提取长度 (字符数)
const MAX_GLOBAL_CHARS = 15000;

const TYPE_ICONS: Record<string, string> = {
  KEY: '🔑',
  HARD: '❓',
  LINK: '💡',
  BRIDGE: '🌉',
};

// ============================================
// Track 1: 全局大纲生成 (Global Summary)
// ============================================
export async function generateGlobalSummary(bookId: string, htmlContent: string): Promise<void> {
  const book = db.prepare('SELECT summary FROM books WHERE id = ?').get(bookId) as BookRow | undefined;
  if (book && book.summary) return; // 已经有全局概要了，不再生成

  const settingsRows = db.prepare('SELECT key, value FROM settings').all() as SettingsRow[];
  const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));
  const activeModel = (settings.active_model || 'qwen') as AIModel;
  const apiKey = (settings[`api_key_${activeModel}`] || process.env[`${activeModel.toUpperCase()}_API_KEY`]) as string;
  if (!apiKey) return;

  const paragraphs = extractParagraphs(htmlContent);
  const fullText = paragraphs.join('\n\n');
  
  let targetText = fullText;
  
  // 核心安全红线：截断采样（首尾缝合机制）防止天价 Token 账单
  if (fullText.length > MAX_GLOBAL_CHARS) {
    const headLimit = Math.floor(MAX_GLOBAL_CHARS * 0.66); // 优先看开头约 1w 字
    const tailLimit = MAX_GLOBAL_CHARS - headLimit;        // 顺带看结尾约 5k 字
    
    const head = fullText.substring(0, headLimit);
    const tail = fullText.substring(fullText.length - tailLimit, fullText.length);
    targetText = head + '\n\n... (中间数十万字省略以节省阅读器 Token) ...\n\n' + tail;
    console.log(`[Track 1] 文本过长，触发截断保护，摘取首尾合计约 ${MAX_GLOBAL_CHARS} 字符送入全览大纲。`);
  }

  const systemPrompt = "你是一位高级阅读助理。请根据传入的文档内容，用大约 150 字精练地概括这篇文档的核心主题和讨论要点作为【全书/全文概览】。请只返回概览的纯文本字串，不要包含任何 json 格式或客套话。";
  const userPrompt = `这里是文档内容：\n\n${targetText}`;

  try {
    const reply = await callAI({ model: activeModel, apiKey, systemPrompt, userPrompt });
    const summary = reply.trim();
    if (summary) {
      db.prepare('UPDATE books SET summary = ? WHERE id = ?').run(summary, bookId);
      console.log(`[Track 1] 书籍 ${bookId} 的全局大纲生成完毕！`);
    }
  } catch (err) {
    console.error('[Track 1] 预生成概要失败：', err);
  }
}

// ============================================
// Track 2: 渐进式角标分析 (Progressive Window Annotations)
// ============================================
export async function preGenerateParagraphAnnotations(bookId: string, htmlContent: string, progress: number = 0.0): Promise<void> {
  const bookMeta = db.prepare('SELECT has_text_layer FROM books WHERE id = ?').get(bookId) as { has_text_layer?: number };
  if (bookMeta && bookMeta.has_text_layer === 0) {
    console.log(`[PreGen] 书籍 ${bookId} 检测为无文本层扫描版，跳过AI预生成。`);
    return;
  }
  
  const settingsRows = db.prepare('SELECT key, value FROM settings').all() as SettingsRow[];
  const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));
  const activeModel = (settings.active_model || 'qwen') as AIModel;
  const apiKey = (settings[`api_key_${activeModel}`] || process.env[`${activeModel.toUpperCase()}_API_KEY`]) as string;
  if (!apiKey) return;

  const allParagraphs = extractParagraphs(htmlContent);
  if (allParagraphs.length === 0) return;

  // 根据进度计算目标窗口的起始位置
  const targetIndex = Math.max(0, Math.min(Math.floor(progress * allParagraphs.length), allParagraphs.length - 1));
  // 默认我们分析从 targetIndex 开始，或者附近，为了简单起见，从 [startIdx, startIdx + CHUNK_SIZE]
  let startIdx = targetIndex - Math.floor(CHUNK_SIZE / 2); // 居中选取
  if (startIdx < 0) startIdx = 0;
  
  const endIdx = Math.min(startIdx + CHUNK_SIZE, allParagraphs.length);
  const windowParagraphs = allParagraphs.slice(startIdx, endIdx);

  // 幂等：如果这块区域已经有标记存在，判断为处理过了。
  // 通过统计 paragraph_annotations 是否存在 index 在 [startIdx, endIdx] 之间的大量落点
  const existing = db.prepare(`
    SELECT COUNT(DISTINCT paragraph_index) as cnt 
    FROM paragraph_annotations 
    WHERE book_id = ? AND paragraph_index >= ? AND paragraph_index < ?
  `).get(bookId, startIdx, endIdx) as { cnt: number };
  
  // 幂等阻断：当前视窗如果检测到已经有生成的痕迹，强制跳过，避免重复消耗 Token 和重复插入
  if (existing.cnt > 0) {
    return;
  }
  
  const maxMarks = Math.max(1, Math.floor(windowParagraphs.length * MARK_RATIO));

  const bookData = db.prepare('SELECT summary FROM books WHERE id = ?').get(bookId) as BookRow;

  const defaultPregenPrompt = `你是一位幽默风趣、极具洞察力的读者。你的任务是阅读指定的文章段落，从中挑出最值得关注的部分，打上角标。

类型与批注要求：
- KEY: 🔑 核心结论/重点（一句最有力的话）
- HARD: ❓ 烧脑难点（人话解释）
- LINK: 💡 灵光一闪（奇妙比喻）
- BRIDGE: 🌉 跨界联系

约束限制：
1. 本次段落最多提取 ${maxMarks} 个，宁缺毋滥。
2. 必须返回包含 \`annotations\` 数组的 JSON，形如：
   { "annotations": [{"index": 段落序号, "type": "KEY|HARD|LINK|BRIDGE", "insight": "20字内的简短精辟金句批注"}] }
3. 如果完全找不到值得标记的内容，返回空数组即可。
4. 只返回合法的纯 JSON 对象。`;

  // 将动态变量注入到用户自定义模板（或兜底模板）中
  const userDefinedPrompt = settings.prompt_pregen || defaultPregenPrompt;
  let systemPrompt = userDefinedPrompt.replace('${maxMarks}', String(maxMarks));

  const userProfile = settings.user_profile;
  const bookGoal = settings[`book_goal_${bookId}`];
  if (userProfile || bookGoal) {
      systemPrompt = `【补充说明：为了生成更符合用户口味的洞见，请侧重于寻找与以下信息相关的点】
${userProfile ? `用户画像：\n${userProfile}\n` : ''}${bookGoal ? `本书阅读目的：\n${bookGoal}\n` : ''}
---
${systemPrompt}`;
  }

  // 注入全书大纲以辅助当前这一小块的理解
  let userPrompt = '';
  if (bookData?.summary) {
    userPrompt += `[全书前置概要，仅供理解上下文背景]：\n${bookData.summary}\n\n`;
  }
  userPrompt += `[接下来是你需要评估与提取批注的段落]：\n` + 
    windowParagraphs.map((p, i) => `[${startIdx + i}] ${p.slice(0, 200)}`).join('\n\n');

  try {
    const reply = await callAI({ model: activeModel, apiKey, systemPrompt, userPrompt });
    const jsonStr = reply.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const resultObj = JSON.parse(jsonStr);
    
    const results = Array.isArray(resultObj) ? resultObj : (resultObj.annotations || []);

    const insert = db.prepare(`
      INSERT OR IGNORE INTO paragraph_annotations (id, book_id, paragraph_index, paragraph_text, type, insight)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let added = 0;
    const insertMany = db.transaction((items: any[]) => {
      for (const item of items) {
        if (typeof item.index !== 'number' || !item.type || !item.insight) continue;
        if (!TYPE_ICONS[item.type]) continue;
        const para = allParagraphs[item.index];
        if (!para) continue;
        insert.run(crypto.randomUUID(), bookId, item.index, para.slice(0, 500), item.type, item.insight);
        added++;
      }
    });

    insertMany(results);
    console.log(`[Track 2] 进度 ${progress.toFixed(2)}，完成 ${startIdx}-${endIdx} 区间的角标生成，共获得 ${added} 处标记。`);
  } catch (err) {
    console.error('[Track 2] 渐进式生成角标失败：', err);
  }
}

/** 从 HTML 字符串中提取有意义的段落文本 */
function extractParagraphs(html: string): string[] {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?(p|h[1-6]|div|section|article|blockquote|li)[^>]*>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

  return text
    .split(/\n{2,}/)
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(s => s.length > 50);
}
