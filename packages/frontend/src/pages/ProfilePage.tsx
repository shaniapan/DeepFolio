import { useEffect, useState } from 'react';
import { api } from '../api/client';
import TopBar from '../components/TopBar';

export default function ProfilePage() {
  const [profile, setProfile] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settings.get().then(s => setProfile(s.user_profile || ''));
  }, []);

  async function handleSave() {
    await api.settings.set({ user_profile: profile });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e' }}>
      <TopBar showBack title="全局用户档案" />
      <main style={{ maxWidth: 560, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24 }}>
          <h2 style={{ color: '#f1f5f9', fontSize: 16, margin: '0 0 8px' }}>👤 完善你是谁</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
            这极其重要。这些信息将作为 AI 的全局上下文锚定，让 AI 能够针对你的背景和目标提供更个性化的比喻、建议和行动清单。
          </p>

          <label style={{ color: '#94a3b8', fontSize: 13 }}>你的画像与目标（例如：互联网产品经理，正在探索 AI 交互设计，想看看怎么把理论落地...）</label>
          <textarea 
            value={profile} 
            onChange={e => setProfile(e.target.value)}
            placeholder="我是一名..." 
            rows={8}
            style={{ 
              width: '100%', background: '#1e293b', border: '1px solid #334155',
              borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14,
              outline: 'none', boxSizing: 'border-box', marginTop: 8, marginBottom: 24, resize: 'vertical'
            }} 
          />

          <button onClick={handleSave}
            style={{
              width: '100%', background: '#6366f1', border: 'none', borderRadius: 8,
              padding: '10px 0', color: '#fff', fontSize: 14, cursor: 'pointer', fontWeight: 600,
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
            onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
          >
            {saved ? '✅ 已保存' : '保存系统级档案'}
          </button>
        </div>
      </main>
    </div>
  );
}
