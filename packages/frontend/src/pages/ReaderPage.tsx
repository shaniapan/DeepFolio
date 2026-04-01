import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Book, type Progress, type Annotation } from '../api/client';
import TopBar from '../components/TopBar';
import EpubReader from '../components/EpubReader';
import PdfReader from '../components/PdfReader';
import FloatingMenu from '../components/FloatingMenu';

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [menu, setMenu] = useState<{ x: number; y: number; text: string; cfi: string } | null>(null);

  useEffect(() => {
    if (!bookId) return;
    api.books.list().then(books => setBook(books.find(b => b.id === bookId) ?? null));
    api.progress.get(bookId).then(setProgress);
    api.annotations.list(bookId).then(setAnnotations);
  }, [bookId]);

  function handleLocationChange(cfi: string) {
    if (!bookId) return;
    api.progress.set(bookId, { position: cfi, last_mode: 'immersive' });
  }

  function handleTextSelect(text: string, cfi: string) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setMenu({ x: rect.left + rect.width / 2 - 60, y: rect.top - 40, text, cfi });
  }

  async function handleAddHighlight(color: string) {
    if (!menu || !bookId) return;
    const res = await api.annotations.create(bookId, {
      type: 'highlight', position: menu.cfi, selected_text: menu.text, color
    });
    setMenu(null);
    api.annotations.list(bookId).then(setAnnotations);
  }

  async function handleExport() {
    if (!bookId) return;
    try {
      const res = await api.annotations.export(bookId);
      if (res.ok) alert(`笔记已导出至：\n${res.file}`);
    } catch (err: any) {
      alert(`导出失败: ${err.message}`);
    }
  }

  if (!book || !progress) return (
    <div style={{ background: '#0a0f1e', minHeight: '100vh', color: '#94a3b8',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      加载中...
    </div>
  );

  const fileUrl = `http://localhost:3001/files/${book.filename}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0f1e' }}>
      <TopBar showBack title={book.title} onExport={handleExport} />
      <div style={{ flex: 1, overflow: 'hidden', padding: 16 }}>
        {book.format === 'epub' && (
          <EpubReader
            url={fileUrl}
            initialCfi={progress.position || undefined}
            onLocationChange={handleLocationChange}
            onTextSelect={handleTextSelect}
          />
        )}
        {book.format === 'pdf' && (
          <PdfReader
            url={fileUrl}
            initialPage={Number(progress.position) || 1}
            onPageChange={page => bookId && api.progress.set(bookId, { position: String(page), last_mode: 'immersive' })}
          />
        )}
      </div>

      {menu && (
        <FloatingMenu
          x={menu.x} y={menu.y}
          onClose={() => setMenu(null)}
          onColorSelect={handleAddHighlight}
        />
      )}
    </div>
  );
}
