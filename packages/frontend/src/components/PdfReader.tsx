import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// 使用 CDN worker，避免构建复杂性
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Props {
  url: string;
  initialPage?: number;
  onPageChange: (page: number) => void;
}

export default function PdfReader({ url, initialPage = 1, onPageChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  useEffect(() => {
    pdfjsLib.getDocument(url).promise.then(pdf => {
      pdfRef.current = pdf;
      setTotalPages(pdf.numPages);
      renderPage(pdf, initialPage);
    });
    return () => { pdfRef.current?.destroy(); };
  }, [url]);

  async function renderPage(pdf: pdfjsLib.PDFDocumentProxy, pageNum: number) {
    if (!containerRef.current) return;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(canvas);
  }

  async function goTo(pageNum: number) {
    if (!pdfRef.current || pageNum < 1 || pageNum > totalPages) return;
    setCurrentPage(pageNum);
    onPageChange(pageNum);
    await renderPage(pdfRef.current, pageNum);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center' }}>
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', width: '100%', background: '#e2e8f0' }} />
      <div style={{ padding: '8px 16px', background: '#1e293b', display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={() => goTo(currentPage - 1)} disabled={currentPage <= 1}
          style={{ background: '#334155', border: 'none', color: '#f1f5f9', padding: '4px 12px', borderRadius: 4, cursor: 'pointer' }}>
          ←
        </button>
        <span style={{ color: '#94a3b8', fontSize: 13 }}>{currentPage} / {totalPages}</span>
        <button onClick={() => goTo(currentPage + 1)} disabled={currentPage >= totalPages}
          style={{ background: '#334155', border: 'none', color: '#f1f5f9', padding: '4px 12px', borderRadius: 4, cursor: 'pointer' }}>
          →
        </button>
      </div>
    </div>
  );
}
