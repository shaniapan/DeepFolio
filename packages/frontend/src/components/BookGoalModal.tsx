import { useState, useEffect } from 'react';
import { api } from '../api/client';

interface Props {
  bookId: string;
  defaultMode?: 'immersive' | 'tools';
  startStep?: 1 | 2;
  onClose: () => void;
  onModeSelect?: (mode: 'immersive' | 'tools') => void;
}

export default function BookGoalModal({ bookId, defaultMode, startStep = 1, onClose, onModeSelect }: Props) {
  const [step, setStep] = useState(startStep);
  const [goal, setGoal] = useState('');
  const [userProfile, setUserProfile] = useState('');

  useEffect(() => {
    api.settings.get().then(s => {
      setGoal(s[`book_goal_${bookId}`] || '');
      setUserProfile(s.user_profile || '');
    });
  }, [bookId]);

  async function handleSaveGoal() {
    if (goal.trim()) {
      await api.settings.set({ [`book_goal_${bookId}`]: goal });
      api.settings.mergeProfile(goal).catch(console.error); // 触发服务器异步生成并入全局档案
    }
    if (onModeSelect) onModeSelect('tools');
    onClose();
  }

  function handleSelectMode(m: 'immersive' | 'tools') {
    if (m === 'immersive') {
      if (onModeSelect) onModeSelect('immersive');
      onClose();
    } else {
      setStep(2);
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24, width: '100%', maxWidth: 460, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        {step === 1 ? (
          <>
            <h3 style={{ margin: '0 0 8px', color: '#f1f5f9', fontSize: 18, textAlign: 'center' }}>请选择阅读模式</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24, textAlign: 'center' }}>你可以随时在顶部切换模式，进度和笔记互通</p>
            
            <div style={{ display: 'flex', gap: 16 }}>
              <div 
                onClick={() => handleSelectMode('tools')}
                style={{
                  flex: 1, padding: 20, borderRadius: 12, border: '2px solid transparent',
                  background: 'linear-gradient(#1e293b, #1e293b) padding-box, linear-gradient(135deg, #3b82f6, #8b5cf6) border-box',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                <div style={{ fontSize: 32 }}>⚡</div>
                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 15 }}>工具式</div>
                <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>
                  向导引导，发掘问题，<br/>借助 AI 深度理解
                </div>
              </div>

              <div 
                onClick={() => handleSelectMode('immersive')}
                style={{
                  flex: 1, padding: 20, borderRadius: 12, border: '2px solid #334155', background: '#1e293b',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#475569'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#334155'}
              >
                <div style={{ fontSize: 32 }}>🌊</div>
                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 15 }}>沉浸式</div>
                <div style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>
                  安静深读，悬浮答疑，<br/>只在需要时唤醒 AI
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
               <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: 13 }}>取消</button>
            </div>
          </>
        ) : (
          <>
            <h3 style={{ margin: '0 0 16px', color: '#f1f5f9', fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>🎯 设定你的目的</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.5 }}>
              你为什么要读这本书？想解决什么痛点？<br/>
              （AI Copilot 会带着这个滤镜为你提取内容，并化为全局记忆）
            </p>
            {userProfile && (
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px dashed rgba(59, 130, 246, 0.3)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#60a5fa', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <span>🧩 已接通全局记忆</span>
                </div>
                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {userProfile}
                </div>
              </div>
            )}
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="例如：我想在这本书里找到关于用户增长的有效案例..."
              rows={4}
              style={{
                width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 6,
                padding: 12, color: '#f8fafc', fontSize: 14, outline: 'none', resize: 'none', marginBottom: 16, boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { if (onModeSelect) onModeSelect('tools'); onClose(); }} style={{ padding: '8px 16px', background: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: 14 }}>跳过目标</button>
              <button onClick={handleSaveGoal} style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>开启深度阅读</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
