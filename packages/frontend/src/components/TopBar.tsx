import { Link, useNavigate } from 'react-router-dom';

interface Props { showBack?: boolean; title?: string; onExport?: () => void; }

export default function TopBar({ showBack, title, onExport }: Props) {
  const nav = useNavigate();
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 20px', background: '#0f172a',
      borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 100
    }}>
      {showBack && (
        <button onClick={() => nav(-1)}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14 }}>
          ← 书库
        </button>
      )}
      <span style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600 }}>
        {title ?? 'Reader'}
      </span>
      <div style={{ flex: 1 }} />
      {onExport && (
        <button onClick={onExport} style={{
          background: '#334155', border: 'none', color: '#f1f5f9', padding: '4px 12px',
          borderRadius: 4, cursor: 'pointer', fontSize: 13, marginRight: 8
        }}>导出笔记</button>
      )}
      <Link to="/settings" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>⚙️ 设置</Link>
    </header>
  );
}
