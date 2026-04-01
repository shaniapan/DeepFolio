import { useEffect, useState } from 'react';
import { api } from '../api/client';
import TopBar from '../components/TopBar';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings.get().then(setSettings);
  }, []);

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
              <div style={{ display: 'flex', gap: 16, color: '#e2e8f0' }}>
                <ModelOption value="deepseek" label="DeepSeek (推荐)" />
                <ModelOption value="openai" label="OpenAI" />
              </div>
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

            <div>
              <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>
                OpenAI API Key
              </label>
              <input type="password" value={settings.api_key_openai || ''}
                onChange={e => setSettings(s => ({ ...s, api_key_openai: e.target.value }))}
                placeholder="sk-..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 6, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9' }} />
            </div>
          </section>

          <button type="submit" disabled={saving}
            style={{ alignSelf: 'flex-start', background: '#6366f1', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            {saving ? '保存中...' : '保存更改'}
          </button>
        </form>
      </main>
    </div>
  );
}
