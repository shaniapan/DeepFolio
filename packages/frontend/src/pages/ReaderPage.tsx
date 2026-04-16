import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Book, type Progress, type Annotation, type ParagraphAnnotation } from '../api/client';
import TopBar from '../components/TopBar';
import EpubReader from '../components/EpubReader';
import PdfReader from '../components/PdfReader';
import HtmlReader from '../components/HtmlReader';
import FloatingMenu from '../components/FloatingMenu';
import CopilotPanel from '../components/CopilotPanel';
import BookGoalModal from '../components/BookGoalModal';

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null | undefined>(undefined);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [highlights, setHighlights] = useState<Annotation[]>([]);
  const [paragraphAnnotations, setParagraphAnnotations] = useState<ParagraphAnnotation[]>([]);
  const [menu, setMenu] = useState<{ rect: DOMRect; text: string; cfi: string; highlightId?: string; savedInsight?: string } | null>(null);
  const [copilot, setCopilot] = useState<{ isOpen: boolean; action?: string; text?: string }>({ isOpen: false });
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [modalStartStep, setModalStartStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (!bookId) return;
    api.books.list().then(books => {
      const b = books.find(b => b.id === bookId);
      if (!b) {
        setBook(null);
      } else {
        setBook(b);
        // Auto open copilot if the book has text layer
        if (b.has_text_layer !== 0) {
          setCopilot(c => ({ ...c, isOpen: true }));
        }
      }
    });
    api.progress.get(bookId).then(setProgress);
    api.highlights.list(bookId).then(setHighlights);

    // Initial check for mode selection and goal
    const promptedKey = `mode_selected_v2_${bookId}`;
    if (!localStorage.getItem(promptedKey)) {
        setTimeout(() => {
           setModalStartStep(1);
           setShowGoalModal(true);
        }, 100);
        localStorage.setItem(promptedKey, '1');
    }

    // 触发段落预生成（幂等，后台异步，不阻塞）
    api.paragraphs.generate(bookId)
      .then(() => api.paragraphs.list(bookId))
      .then(setParagraphAnnotations)
      .catch(() => {}); // 静默失败，不影响阅读
    // 30 秒后再拉一次，给 AI 预生成足够时间
    const t = setTimeout(() => api.paragraphs.list(bookId).then(setParagraphAnnotations).catch(() => {}), 30000);
    return () => clearTimeout(t);
  }, [bookId]);

  const handleScrollChange = (top: number) => {
    if (!book) return;
    api.progress.set(book.id, { position: top.toString(), last_mode: 'immersive' });
  };

  const handleProgressChange = async (percent: number) => {
    if (!book) return;
    // 触发后端渐进式段落解析
    await api.paragraphs.generate(book.id, percent);
    // 生成动作是异步且持续的，因此等待片刻后拉取最新结果（也可以用 SSE，目前采用简单轮询或单次拉取补偿）
    setTimeout(() => {
      api.paragraphs.list(book.id).then(setParagraphAnnotations);
    }, 2000);
  };

  function handleLocationChange(cfi: string) {
    if (!bookId) return;
    api.progress.set(bookId, { position: cfi, last_mode: 'immersive' });
  }

  function handleTextSelect(text: string, cfi: string) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    setMenu({ rect, text, cfi });
  }

  async function handleAddHighlight(color: string) {
    if (!menu || !bookId) return;

    // Clear native browser selection to simulate immediate transition while API loads
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();

    if (menu.highlightId) {
       await api.annotations.delete(bookId, menu.highlightId);
    }
    await api.highlights.create(bookId, {
      type: 'highlight', position: menu.cfi, selected_text: menu.text, color
    });
    // Optimistic backend reload
    api.highlights.list(bookId).then(setHighlights);
    setMenu({ ...menu, highlightId: undefined });
  }

  async function handleSaveInsight(content: string) {
    if (!menu || !bookId) return;

    // Clear selection
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();

    // If it was already a highlight, we delete it and recreate as Note
    if (menu.highlightId) {
       await api.annotations.delete(bookId, menu.highlightId);
    }
    
    // Create new persistent Note containing the AI Insight
    await api.highlights.create(bookId, {
      type: 'note', position: menu.cfi, selected_text: menu.text, color: 'yellow', note_content: content
    });
    
    // Refetch marks so the 📌 appears
    api.highlights.list(bookId).then(setHighlights);
    // Transform menu to reflect saved state
    setMenu({ ...menu, savedInsight: content, highlightId: undefined }); // Wait, without an ID it might create duplicates if clicked again. But we replaced the view.
  }

  async function handleDeleteHighlight() {
     if (!menu || !bookId || !menu.highlightId) return;
     await api.annotations.delete(bookId, menu.highlightId);
     setMenu(null);
     api.highlights.list(bookId).then(setHighlights);
  }

  function handleAiAction(action: string) {
    if (!menu) return;
    setCopilot({ isOpen: true, action, text: menu.text });
    setMenu(null);
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

  if (book === null) {
    return (
      <div style={{ background: '#0a0f1e', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#f1f5f9', gap: 16 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>📚 找不到书籍</h2>
        <p style={{ color: '#94a3b8', fontSize: 14 }}>这本书可能已经被你的其他操作删除了。</p>
        <button onClick={() => window.location.href = '/'} style={{ padding: '8px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
          返回书库
        </button>
      </div>
    );
  }

  if (book === undefined || !progress) return (
    <div style={{ background: '#0a0f1e', minHeight: '100vh', color: '#94a3b8',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      加载中...
    </div>
  );

  const fileUrl = `http://localhost:3001/files/${book.filename}`;

  return (
    <div style={{ display: 'flex', flex: 1, height: '100vh', background: '#0a0f1e', overflow: 'hidden' }}>
      
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', padding: '0 16px', borderRight: copilot.isOpen ? '1px solid #1e293b' : 'none', position: 'relative' }}>
          <TopBar 
             showBack title={book.title} onExport={handleExport} immersive={!copilot.isOpen} 
             mode={book.has_text_layer !== 0 ? (copilot.isOpen ? 'tools' : 'immersive') : undefined}
             onModeChange={m => setCopilot(c => ({...c, isOpen: m === 'tools'}))}
             onGoalClick={book.has_text_layer !== 0 ? (() => { setModalStartStep(2); setShowGoalModal(true); }) : undefined}
          />
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
              onTextSelect={handleTextSelect}
            />
          )}
          {book.format === 'html' && (
            <HtmlReader
              url={fileUrl}
              initialScroll={Number(progress.position) || 0}
              highlights={highlights}
              paragraphAnnotations={paragraphAnnotations}
              onScrollChange={handleScrollChange}
              onProgressChange={handleProgressChange}
              onTextSelect={handleTextSelect}
              onHighlightClick={(id, text, rect) => {
                const hl = highlights.find(h => h.id === id);
                setMenu({
                  rect,
                  text,
                  cfi: `highlight-${id}`,
                  highlightId: id,
                  savedInsight: hl?.note_content || undefined
                });
              }}
            />
          )}
        </div>

        {copilot.isOpen && book.has_text_layer !== 0 && (
          <div style={{ width: 400, background: '#0f172a' }}>
          <CopilotPanel
              bookId={book.id}
              bookSummary={book.summary}
              selectedText={copilot.text || ''}
              initialAction={copilot.action}
              paragraphAnnotations={paragraphAnnotations}
              onClose={() => setCopilot({ isOpen: false })}
            />
          </div>
        )}

        {!copilot.isOpen && book.has_text_layer !== 0 && (
          <button
            onClick={() => setCopilot({ isOpen: true })}
            style={{
              position: 'absolute', right: 32, bottom: 32, zIndex: 100,
              width: 48, height: 48, borderRadius: 24, background: '#3b82f6',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)', color: 'white',
              border: 'none', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 24,
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            title="唤出 AI Copilot"
          >
            ✨
          </button>
        )}
      </div>

      {menu && bookId && (
        <FloatingMenu
          bookId={bookId}
          rect={menu.rect}
          text={menu.text}
          savedInsight={menu.savedInsight}
          onClose={() => setMenu(null)}
          onColorSelect={handleAddHighlight}
          onAiAction={handleAiAction}
          onDelete={menu.highlightId ? handleDeleteHighlight : undefined}
          onSaveInsight={handleSaveInsight}
        />
      )}
      
      {showGoalModal && bookId && (
        <BookGoalModal 
           bookId={bookId} 
           startStep={modalStartStep}
           onClose={() => setShowGoalModal(false)}
           onModeSelect={(m) => {
              setCopilot(c => ({...c, isOpen: m === 'tools'}));
              if (progress) api.progress.set(bookId, { position: progress.position || '', last_mode: m }).catch(console.error);
           }}
        />
      )}
    </div>
  );
}
