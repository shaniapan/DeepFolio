import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api/client';

interface Props {
  bookId: string;
  rect: DOMRect;
  text?: string;
  onColorSelect: (color: string) => void;
  onAiAction?: (action: string) => void;
  onDelete?: () => void;
  onClose: () => void;
  savedInsight?: string;
  onSaveInsight?: (content: string) => void;
}

export default function FloatingMenu({ bookId, rect, text, onColorSelect, onAiAction, onDelete, onClose, savedInsight, onSaveInsight }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });

  const isExpanded = aiLoading || aiResult !== null || !!savedInsight;
  // 如果产生了新的 AI 结果，优先展示新结果，以便用户可以覆盖保存
  const currentInsight = aiResult !== null ? aiResult : savedInsight;

  useEffect(() => {
    if (!rect) return;
    let left = rect.left + rect.width / 2 - 80;
    left = Math.max(10, Math.min(left, window.innerWidth - (isExpanded ? 500 : 350) - 10));

    // 默认展示区域在选中文字的正下方，避免下拉展开时遮挡原文
    let top = rect.bottom + 10;
    
    // 如果是展开状态，由于卡片可能很高（假设300px），需要判断下方空间是否足够
    // 如果下方空间不足，则翻转到文字上方
    if (isExpanded) {
      const estimatedHeight = 300;
      if (top + estimatedHeight > window.innerHeight - 20) {
        top = Math.max(10, rect.top - estimatedHeight - 10);
      }
    } else {
      // 瞬态工具栏一般也跟随在底部，如果底部溢出，翻转到顶部
      if (top + 50 > window.innerHeight) {
        top = Math.max(10, rect.top - 50);
      }
    }
    
    setPos({ left, top });
  }, [rect, isExpanded]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Listen to mousedown with capture to intercept before other click handlers clear text selection
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [onClose]);

  const colors = [
    { name: 'yellow', hex: '#fef08a' },
    { name: 'blue', hex: '#bfdbfe' },
    { name: 'green', hex: '#bbf7d0' },
    { name: 'red', hex: '#fecaca' }
  ];

  const aiActions = [
    { id: 'ask', icon: '💬', label: '提问' },
    { id: 'explain', icon: '🧠', label: '解释' },
    { id: 'extract', icon: '📝', label: '提炼' },
    { id: 'critique', icon: '⚔️', label: '批判' },
    { id: 'translate', icon: '✨', label: '翻译' }
  ];

  async function handleInlineAi(actionId: string) {
    if (actionId === 'ask' && onAiAction) {
       onAiAction(actionId);
       return;
    }
    
    if (!text) return;
    
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await api.ai.ask(bookId, actionId, text, []);
      setAiResult(res.reply);
    } catch (err: any) {
      setAiResult(`❌ 请求出错: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  }


  return (
    <div ref={menuRef} style={{
      position: 'fixed', left: pos.left, top: pos.top, zIndex: 1000,
      display: 'flex', flexDirection: 'column',
      width: isExpanded ? 500 : undefined,
      alignItems: 'stretch',
      boxShadow: isExpanded ? '0 10px 25px -5px rgb(0 0 0 / 0.7), 0 8px 10px -6px rgb(0 0 0 / 0.4)' : '0 4px 6px -1px rgb(0 0 0 / 0.3)',
      borderRadius: 8,
      overflow: 'hidden',
      background: '#1e293b',
      border: '1px solid #334155'
    }}>
      {/* 顶部 L1 瞬态捕捉器（工具栏） */}
      <div style={{
        background: 'transparent', 
        borderBottom: isExpanded ? '1px dashed #334155' : 'none',
        padding: '8px 12px', display: 'flex', gap: 12, 
        alignItems: 'center',
        justifyContent: 'flex-start'
      }}>
        {/* 高亮色块区 (乐观态渲染处理) */}
        <div style={{ display: 'flex', gap: 6 }}>
          {colors.map(c => {
            const isActive = activeColor === c.name;
            return (
              <button key={c.name} onMouseDown={e => { 
                  e.preventDefault(); 
                  setActiveColor(c.name); 
                  onColorSelect(c.name);
                }}
                title={`标记为${c.name}并保留菜单`}
                style={{
                  width: 24, height: 24, borderRadius: '50%', background: c.hex,
                  border: isActive ? '2px solid #f1f5f9' : '2px solid transparent',
                  outline: isActive ? '2px solid #3b82f6' : 'none',
                  cursor: 'pointer', transition: 'all 0.15s ease-out',
                  transform: isActive ? 'scale(1.15)' : 'scale(1)'
                }} />
            );
          })}
        </div>
        
        {/* 分割线：心智隔离 */}
        <div style={{ width: 1, height: 20, background: 'rgba(51, 65, 85, 0.8)' }} />

        {/* AI Action 区 */}
        <div style={{ display: 'flex', gap: 6 }}>
          {aiActions.map(act => (
            <button key={act.id} onMouseDown={e => { e.preventDefault(); handleInlineAi(act.id); }}
              style={{
                background: 'transparent', border: 'none', color: '#94a3b8', 
                fontSize: 13, cursor: 'pointer', padding: '4px 6px', borderRadius: 4,
                display: 'flex', alignItems: 'center', gap: 4, transition: 'background 0.2s, color 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#f8fafc'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              <span>{act.icon}</span> {act.label}
            </button>
          ))}
          {/* 取消高亮按钮 */}
          {onDelete && (
             <button onMouseDown={e => { e.preventDefault(); onDelete(); }}
               style={{
                 background: 'transparent', border: 'none', color: '#ef4444', 
                 fontSize: 14, cursor: 'pointer', padding: '4px 6px', borderRadius: 4,
                 display: 'flex', alignItems: 'center', gap: 4, transition: 'background 0.2s',
                 whiteSpace: 'nowrap'
               }}
               title="移除高亮"
               onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
               onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
             >
               🗑️
             </button>
          )}
        </div>
      </div>
      
      {/* L2 合体容器：内联 AI 结果展示 */}
      {isExpanded && (
         <div style={{
           display: 'flex', flexDirection: 'column', overflow: 'hidden'
         }}>
            <div style={{ padding: '8px 16px', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                 <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>✨ 深度洞见</span>
                 {currentInsight && currentInsight !== savedInsight && onSaveInsight && (
                   <button onMouseDown={e => { e.preventDefault(); onSaveInsight(currentInsight); }} 
                     style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', color: '#60a5fa', fontSize: 11, cursor: 'pointer', padding: '2px 8px', borderRadius: 12, transition: 'all 0.2s' }}
                     onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.4)'}
                     onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                   >
                     📌 {savedInsight ? '更新资产' : '收藏'}
                   </button>
                 )}
                 {savedInsight && currentInsight === savedInsight && (
                   <span style={{ background: '#064e3b', border: '1px solid #059669', color: '#34d399', fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>📌 已作为资产稳定存储</span>
                 )}
               </div>
               <button onMouseDown={e => { e.preventDefault(); setAiResult(null); setAiLoading(false); onClose(); }} title="关闭" style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.color = '#64748b'}>×</button>
            </div>
            
            <div style={{ 
               padding: '16px 20px', overflowY: 'auto', flex: 1, fontSize: 14, color: '#e2e8f0', // Softer white
               lineHeight: 1.75 // Better Typography 
               }}
               onMouseDown={e => e.stopPropagation()}
            >
               {aiLoading ? (
                 <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#60a5fa', fontStyle: 'italic', fontWeight: 500 }}>
                    <span className="spinner" style={{ animation: 'spin 1s linear infinite' }}>⏳</span> 正在思考为您解释...
                 </div>
               ) : (
                 <div className="copilot-md" style={{ paddingBottom: 8 }}>
                    <ReactMarkdown>{currentInsight || ''}</ReactMarkdown>
                 </div>
               )}
            </div>
         </div>
      )}
    </div>
  );
}
