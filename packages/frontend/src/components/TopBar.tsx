import { Link, useNavigate } from 'react-router-dom';

interface Props { 
  showBack?: boolean; title?: string; onExport?: () => void; immersive?: boolean; 
  mode?: 'immersive' | 'tools'; onModeChange?: (mode: 'immersive' | 'tools') => void;
  onGoalClick?: () => void;
}

export default function TopBar({ showBack, title, onExport, immersive, mode, onModeChange, onGoalClick }: Props) {
  const nav = useNavigate();
  return (
    <>
      {immersive && (
        <style>{`
          .immersive-zone { position: absolute; top: 0; left: 0; right: 0; height: 40px; z-index: 98; }
          .immersive-header {
            position: absolute; top: 0; left: 0; right: 0;
            opacity: 0; transform: translateY(-100%);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 99;
          }
          .immersive-zone:hover + .immersive-header,
          .immersive-header:hover { opacity: 1; transform: translateY(0); }
        `}</style>
      )}
      {immersive && <div className="immersive-zone" />}
      <header 
        className={immersive ? 'immersive-header' : ''}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 20px', 
          background: immersive ? 'rgba(15, 23, 42, 0.85)' : '#0f172a',
          backdropFilter: immersive ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: immersive ? 'blur(12px)' : 'none',
          borderBottom: '1px solid rgba(30, 41, 59, 0.8)', 
          position: immersive ? 'absolute' : 'sticky', 
          top: 0, zIndex: 100
        }}
      >
      {showBack && (
        <button onClick={() => nav(-1)}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, flexShrink: 0, whiteSpace: 'nowrap' }}>
          ← 书库
        </button>
      )}
      <span 
        title={title ?? 'Reader'}
        style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 }}
      >
        {title ?? 'Reader'}
      </span>
      <div style={{ flex: 1, minWidth: 16 }} />
      {onGoalClick && mode === 'tools' && (
        <button onClick={onGoalClick} style={{
          background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', padding: '4px 12px',
          borderRadius: 18, cursor: 'pointer', fontSize: 12, marginRight: 0, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s', whiteSpace: 'nowrap'
        }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}>
          🎯 本书目标
        </button>
      )}
      {mode && onModeChange && (
        <div style={{
          display: 'flex', background: '#1e293b', padding: 2, borderRadius: 20, 
          border: '1px solid #334155', marginRight: 16, flexShrink: 0, whiteSpace: 'nowrap'
        }}>
          <button 
            onClick={() => onModeChange('immersive')} 
            style={{ 
              background: mode === 'immersive' ? '#3b82f6' : 'transparent', color: mode === 'immersive' ? '#fff' : '#64748b', 
              border: 'none', borderRadius: 18, padding: '4px 12px', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', fontWeight: mode === 'immersive' ? 600 : 'normal', whiteSpace: 'nowrap', flexShrink: 0
            }}>
            沉浸
          </button>
          <button 
            onClick={() => onModeChange('tools')} 
            style={{ 
              background: mode === 'tools' ? '#3b82f6' : 'transparent', color: mode === 'tools' ? '#fff' : '#64748b', 
              border: 'none', borderRadius: 18, padding: '4px 12px', fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', fontWeight: mode === 'tools' ? 600 : 'normal', whiteSpace: 'nowrap', flexShrink: 0
            }}>
            工具
          </button>
        </div>
      )}
      {onExport && (
        <button onClick={onExport} style={{
          background: '#334155', border: 'none', color: '#f1f5f9', padding: '4px 12px',
          borderRadius: 4, cursor: 'pointer', fontSize: 13, marginRight: 8, whiteSpace: 'nowrap', flexShrink: 0
        }}>导出笔记</button>
      )}
      <Link to="/profile" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s', marginRight: 16, whiteSpace: 'nowrap', flexShrink: 0 }} onMouseEnter={e=>e.currentTarget.style.color='#cbd5e1'} onMouseLeave={e=>e.currentTarget.style.color='#64748b'}>👤 个人档案</Link>
      <Link to="/settings" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none', transition: 'color 0.2s', whiteSpace: 'nowrap', flexShrink: 0 }} onMouseEnter={e=>e.currentTarget.style.color='#cbd5e1'} onMouseLeave={e=>e.currentTarget.style.color='#64748b'}>⚙️ 系统设置</Link>
      </header>
    </>
  );
}
