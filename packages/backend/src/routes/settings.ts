import { Router } from 'express';
import { db } from '../db/index.js';
import { callAI, type AIModel } from '../services/ai/adapter.js';
import { triggerBackup } from '../db/backup.js';

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
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('api_key_') && value === '***') continue;
      upsert.run(key, value);
    }
  });
  txn(updates);
  triggerBackup(); // 每次写入时立即触发快照
  res.json({ ok: true });
});

router.post('/merge-profile', (req, res) => {
  const { bookGoal } = req.body;
  if (!bookGoal) {
    res.json({ ok: true });
    return;
  }

  // 避免阻塞前端交互，在后台静默发起大模型合并任务
  (async () => {
    try {
      const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
      const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
      const activeModel = (settings.active_model || 'qwen') as AIModel;
      const apiKey = (settings[`api_key_${activeModel}`] || process.env[`${activeModel.toUpperCase()}_API_KEY`]) as string;
      if (!apiKey) return;

      const currentProfile = settings.user_profile || '';
      const systemPrompt = `你是一个用户画像整合专家。
这里是用户过去留存的全局档案：
${currentProfile || '（暂无）'}

用户刚刚针对一本新书留下了这样的局部阅读目标摘要：
${bookGoal}

请你捕捉并提炼这个动作中透露的“长效性偏好”、“专业痛点”或“关注领域”，用简练平实的语言将其合并到全局档案里。
你的输出应该是一个更加完整连贯的新用户基础档案（纯文本）。请直接输出更新版文本内容，不含过程解释。如果之前的档案是空，直接转化为个人的长期兴趣标签写入。`;

      const updatedProfile = await callAI({
        model: activeModel,
        apiKey,
        systemPrompt,
        userPrompt: "请执行整合并返回更新后的档案文本。"
      });
      
      const newProfile = updatedProfile.trim();
      if (newProfile) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
          .run('user_profile', newProfile);
        triggerBackup(); // 档案合并写入后备份
        console.log('[Settings] 本书目标已成功并入全局 user_profile');
      }
    } catch (err) {
      console.error('[Settings] 合并书籍目标到全局配置时出错:', err);
    }
  })();

  res.json({ ok: true, message: 'Merge profile task started asynchronously' });
});

export default router;
