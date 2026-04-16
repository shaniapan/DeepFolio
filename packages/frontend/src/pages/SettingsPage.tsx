import { useEffect, useState } from 'react';
import { api } from '../api/client';
import TopBar from '../components/TopBar';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [initialLoaded, setInitialLoaded] = useState(false);

  const DEFAULT_PROMPTS: Record<string, string> = {
    prompt_explain: '你是一位顶级学者。用户的选段来自一本书或一篇文章，请用一两句简单的话为用户解释这段话的核心含义。',
    prompt_translate: '你是一位精通多国语言的本地化专家。请将用户提供的内容信达雅地翻译成中文。',
    prompt_critique: '你是一位充满批判性思维的辩论家。请无视作者权威，尝试找出选中这段话中的逻辑漏洞、或者指出其局限性，并给出一个反逻辑视角的论述。',
    prompt_extract: '你是一个知识结构化专家。请提取这段文字的关键概念，以 1-3 条子弹笔记的形式输出，直接抛干货。',
    prompt_followup: '你是一个随行陪读大模型。继续回答用户的追问。结合上下文，给出精准扼要的回复。',
  };

  useEffect(() => {
    api.settings.get().then(s => {
      // 将默认 prompt 值合并进去（优先使用已存储的值），确保它们能被持久化保存
      setSettings({ ...DEFAULT_PROMPTS, ...s });
      setInitialLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!initialLoaded) return;
    setSaving(true);
    const t = setTimeout(() => {
      api.settings.set(settings).then(() => setSaving(false)).catch(console.error);
    }, 800);
    return () => clearTimeout(t);
  }, [settings, initialLoaded]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await api.settings.set(settings);
    setSaving(false);
    alert('保存成功');
  }

  function ModelOption({ value, label }: { value: string; label: string }) {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="radio" name="model" value={value}
          checked={settings.active_model === value}
          onChange={() => setSettings(s => ({ ...s, active_model: value }))} />
        {label}
      </label>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e' }}>
      <TopBar showBack title="设置" />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <section style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, margin: '0 0 16px', color: '#f1f5f9' }}>大模型配置</h2>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                ✅ 首选模型
              </label>
              <div style={{ display: 'flex', gap: 16, color: '#e2e8f0', flexWrap: 'wrap' }}>
                <ModelOption value="qwen" label="通义千问 (Qwen) (推荐)" />
                <ModelOption value="deepseek" label="DeepSeek" />
                <ModelOption value="openai" label="OpenAI" />
                <ModelOption value="kimi" label="月之暗面 (Kimi)" />
                <ModelOption value="minimax" label="MiniMax" />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                通义千问 API Key
              </label>
              <input type="password" value={settings.api_key_qwen || ''}
                onChange={e => setSettings(s => ({ ...s, api_key_qwen: e.target.value }))}
                placeholder="sk-..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                DeepSeek API Key
              </label>
              <input type="password" value={settings.api_key_deepseek || ''}
                onChange={e => setSettings(s => ({ ...s, api_key_deepseek: e.target.value }))}
                placeholder="sk-..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                OpenAI API Key
              </label>
              <input type="password" value={settings.api_key_openai || ''}
                onChange={e => setSettings(s => ({ ...s, api_key_openai: e.target.value }))}
                placeholder="sk-..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                月之暗面 (Kimi) API Key
              </label>
              <input type="password" value={settings.api_key_kimi || ''}
                onChange={e => setSettings(s => ({ ...s, api_key_kimi: e.target.value }))}
                placeholder="sk-..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                MiniMax API Key
              </label>
              <input type="password" value={settings.api_key_minimax || ''}
                onChange={e => setSettings(s => ({ ...s, api_key_minimax: e.target.value }))}
                placeholder="sk-..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }} />
            </div>
          </section>

          <section style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, margin: '0 0 16px', color: '#f1f5f9' }}>⚛️ AI 系统提示词 (Prompts) 配置</h2>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>可自定义大模型在各种阅读辅助场景下的角色与默认语气。清空可恢复系统默认设定。</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>🧠 [解释] Prompt</label>
              <textarea value={settings.prompt_explain ?? ''}
                onChange={e => setSettings(s => ({ ...s, prompt_explain: e.target.value }))}
                style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>✨ [翻译] Prompt</label>
              <textarea value={settings.prompt_translate ?? ''}
                onChange={e => setSettings(s => ({ ...s, prompt_translate: e.target.value }))}
                style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>⚔️ [批判] Prompt</label>
              <textarea value={settings.prompt_critique ?? ''}
                onChange={e => setSettings(s => ({ ...s, prompt_critique: e.target.value }))}
                style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>📝 [提炼] Prompt</label>
              <textarea value={settings.prompt_extract ?? ''}
                onChange={e => setSettings(s => ({ ...s, prompt_extract: e.target.value }))}
                style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>💬 [自由追问] Prompt</label>
              <textarea value={settings.prompt_followup ?? ''}
                onChange={e => setSettings(s => ({ ...s, prompt_followup: e.target.value }))}
                style={{ width: '100%', minHeight: 80, padding: 12, borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>🏷️ [角标与全局大纲] 引擎 Prompt</label>
              <textarea value={settings.prompt_pregen ?? `你是一位幽默风趣、极具洞察力的读者。你的任务是阅读给定的文章段落，从中挑出最值得关注的部分，并打上对应角标，同时为整篇文章写一段大纲摘要。

类型与批注要求：
- KEY: 🔑 核心结论（找准文章的大招/核心主张）
- HARD: ❓ 烧脑难点（一句话点破为什么这里难懂，或者帮读者翻译成人话）
- LINK: 💡 灵光一闪（像朋友一样分享一嘴绝妙的启发或生活中的类比）
- BRIDGE: 🌉 承上启下/跨界联系（这里是怎么把两个不同话题或者学科连起来的？）

强制规则：
1. 角标段落最多提取 \${maxMarks} 个，宁缺毋滥。
2. 必须返回包含 global_summary 和 annotations 的嵌套 JSON 格式，例如：
   {
     "global_summary": "用 150 字左右生动精辟地总结这篇文献的全局核心要义和讨论主题",
     "annotations": [{"index": 段落序号, "type": "KEY|HARD|LINK|BRIDGE", "insight": "简短金句批注"}]
   }
3. insight 的表达必须【极度精简、口语化、接地气、有梗生动】，控制在 20 个字左右。
4. 只允许返回纯 JSON 数据。`}
                placeholder="在此编写自定义的大模型初始结构化分析指令..."
                onChange={e => setSettings(s => ({ ...s, prompt_pregen: e.target.value }))}
                style={{ width: '100%', minHeight: 480, padding: 12, borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>
          </section>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ color: '#94a3b8', fontSize: 13 }}>
              {saving ? '⏳ 自动保存中...' : '✅ 所有更改已自动保存'}
            </span>
            <button type="button" disabled={saving} onClick={handleSave}
              style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
              手动保存
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
