import { useNavigate } from 'react-router-dom';
import type { Book } from '../api/client';

interface Props { book: Book; onDelete: (id: string) => void; }

export default function BookCard({ book, onDelete }: Props) {
  const nav = useNavigate();
  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
      padding: 16, cursor: 'pointer', position: 'relative',
      transition: 'border-color .2s'
    }}
      onClick={() => nav(`/reader/${book.id}`)}>
      <div style={{
        width: '100%', height: 140, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, marginBottom: 12
      }}>
        {book.format === 'pdf' ? '📄' : book.format === 'epub' ? '📗' : '📝'}
      </div>
      <p style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>{book.title}</p>
      <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>{book.format.toUpperCase()}</p>
      <button
        onClick={e => { e.stopPropagation(); onDelete(book.id); }}
        style={{
          position: 'absolute', top: 8, right: 8, background: 'none',
          border: 'none', color: '#475569', cursor: 'pointer', fontSize: 16
        }}>✕</button>
    </div>
  );
}
