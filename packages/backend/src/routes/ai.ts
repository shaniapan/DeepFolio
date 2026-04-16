import { Router, json } from 'express';
import { callAI, type AIModel } from '../services/ai/adapter.js';
import { db } from '../db/index.js';

const router = Router();

const DEFAULT_PROMPTS: Record<string, string> = {
  explain: '你是一位顶级学者。用户的选段来自一本书或一篇文章，请用一两句简单的话为用户解释这段话的核心含义。',
  translate: '你是一位精通多国语言的本地化专家。请将用户提供的内容信达雅地翻译成中文。',
  critique: '你是一位充满批判性思维的辩论家。请无视作者权威，尝试找出选中这段话中的逻辑漏洞、或者指出其局限性，并给出一个反逻辑视角的论述。',
  extract: '你是一个知识结构化专家。请提取这段文字的关键概念，以 1-3 条子弹笔记的形式输出，直接抛干货。',
  followup: '你是一个随行陪读大模型。继续回答用户的追问。结合上下文，给出精准扼要的回复。',
  feynman: '你是一位严格但幽默的导师。用户正在尝试用费曼技巧向你解释一段刚才读过的内容。你的任务是评估他是否真的理解了，或者只是依样画葫芦。如果他不理解，指出他的盲点，并用一个接地气的比喻再帮他讲解一次。',
  flashcard: '你是一个知识晶体提取员。根据用户当前阅读的这本书（系统已提供全局概要信息），提炼出一张结构化的【章节知识卡片】。要求：1. 核心主题（一句话）；2. 3个最重要的关键概念（每个含2句大白话解释）；3. 一个可迁移到日常生活的类比或案例。不要要求用户提供额外选段，直接基于背景信息输出。',
  actionlist: '你是一个行动力教练。根据本书内容和用户的全局档案与目标，提炼出 3 条明确、可立刻执行的【具体行动清单】（Action Items）。要求必须有确切的第一步行动。'
};

router.post('/ask', json(), async (req, res) => {
  const { bookId, action, text, history } = req.body;
  const globalActions = ['feynman', 'flashcard', 'actionlist'];
  if (!text && !history && !(action && globalActions.includes(action))) {
    res.status(400).json({ error: 'Text or history is required.' });
    return;
  }

  try {
    // 动态获取用户配置的模型
    const settingsRows = db.prepare('SELECT key, value FROM settings').all() as {key: string, value: string}[];
    const settings = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));
    
    const activeModel = (settings.active_model || 'qwen') as AIModel;
    const apiKey = (settings[`api_key_${activeModel}`] || process.env[`${activeModel.toUpperCase()}_API_KEY`]) as string;

    if (!apiKey) {
      throw new Error(`请先到设置页面配置 ${activeModel} 的 API Key`);
    }

    const activePrompts: Record<string, string> = {
      explain: settings.prompt_explain || DEFAULT_PROMPTS.explain,
      translate: settings.prompt_translate || DEFAULT_PROMPTS.translate,
      critique: settings.prompt_critique || DEFAULT_PROMPTS.critique,
      extract: settings.prompt_extract || DEFAULT_PROMPTS.extract,
      followup: settings.prompt_followup || DEFAULT_PROMPTS.followup,
      feynman: settings.prompt_feynman || DEFAULT_PROMPTS.feynman,
      flashcard: settings.prompt_flashcard || DEFAULT_PROMPTS.flashcard,
      actionlist: settings.prompt_actionlist || DEFAULT_PROMPTS.actionlist,
    };

    let systemPrompt = '你是一个阅读助手。';
    if (action && activePrompts[action]) {
      systemPrompt = activePrompts[action];
    } else if (history && history.length > 0) {
      systemPrompt = activePrompts.followup;
    }

    // 智能附加全局大纲背景
    if (bookId) {
      const bookGoal = settings[`book_goal_${bookId}`];
      if (bookGoal) {
         systemPrompt = `【本次阅读目标】\n这不仅是普通问答，更要从这个独特的视角出发：${bookGoal}\n\n---\n${systemPrompt}`;
      }
      const book = db.prepare('SELECT summary FROM books WHERE id = ?').get(bookId) as { summary?: string };
      if (book && book.summary) {
        systemPrompt = `【系统全局背景知识】该内容的全文大纲如下，请在理解用户问题时以此作为背景参考：\n${book.summary}\n\n---\n${systemPrompt}`;
      }
    }
    const userProfile = settings.user_profile;
    if (userProfile) {
        systemPrompt = `【用户全局档案】\n记住你的服务对象画像：\n${userProfile}\n请根据该画像调整你的对话深度与举例偏好。\n\n---\n${systemPrompt}`;
    }

    // 将先前的上下文历史合成并构建 prompt
    let userPrompt = '';
    const globalActions = ['feynman', 'flashcard', 'actionlist'];

    if (action && action !== 'ask') {
      if (globalActions.includes(action)) {
         userPrompt = `请开始执行：[${action}]。由于这是全局特性，无需依赖局部选段内容，请直接结合系统赋予你的角色、全局概要信息与用户画像进行高质量输出。`;
      } else {
        // 划词触发的指令（不含直接提问）
        userPrompt = `请对以下内容进行 [${action}] 操作：\n\n"${text}"`;
      }
    } else if (history && history.length > 0 || action === 'ask') {
      // 用户自由提问：如果有划词选区，强制让大模型关注该选区进行答疑
      const lastUserMsg = (history && history.length > 0) ? [...history].reverse().find((h: {role: string}) => h.role === 'user')?.content : '';
      const askContent = lastUserMsg || '';
      
      if (text) {
        userPrompt = `用户正在阅读以下片段：\n「${text}」\n\n用户针对该片段提出了问题：\n${askContent}\n\n请结合上下文背景，针对上述特定片段解答用户的问题。`;
      } else {
         userPrompt = askContent;
      }
    } else {
      userPrompt = text || '';
    }

    const reply = await callAI({
      model: activeModel,
      apiKey,
      systemPrompt,
      userPrompt
    });

    res.json({ reply });

  } catch (err: any) {
    console.error('AI Ask Error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
