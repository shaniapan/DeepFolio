import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';

// 使用 CDN worker，避免构建复杂性
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface Props {
  url: string;
  initialPage?: number;
  onPageChange: (page: number) => void;
  onTextSelect?: (text: string, position: string) => void;
}

export default function PdfReader({ url, initialPage = 1, onPageChange, onTextSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [totalPages, setTotalPages] = useState(0);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  
  const [scale, setScale] = useState(1.5);
  const renderLocks = useRef<Set<number>>(new Set());
  const maxPageSeen = useRef<number>(initialPage);

  useEffect(() => {
    pdfjsLib.getDocument(url).promise.then(async pdf => {
      pdfRef.current = pdf;
      setTotalPages(pdf.numPages);
      
      // Auto-scale based on container width
      if (containerRef.current) {
        try {
          const page1 = await pdf.getPage(1);
          const unscaled = page1.getViewport({ scale: 1.0 });
          const containerWidth = containerRef.current.clientWidth;
          const newScale = (containerWidth - 60) / unscaled.width;
          if (newScale > 0) setScale(newScale);
        } catch (e) {
          console.error('Failed to get page 1 for scaling', e);
        }
      }
    });
    return () => { pdfRef.current?.destroy(); };
  }, [url]);

  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim() && onTextSelect) {
        if (!sel.anchorNode) return;
        const pageEl = sel.anchorNode.parentElement?.closest('.pdf-page');
        const pNum = pageEl ? pageEl.getAttribute('data-page') : String(maxPageSeen.current);
        onTextSelect(sel.toString().trim(), pNum || '1');
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [onTextSelect]);

  useEffect(() => {
    if (!totalPages || !pdfRef.current || !containerRef.current) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const pageNum = Number(entry.target.getAttribute('data-page'));
          if (pageNum) {
             if (pageNum > maxPageSeen.current) {
               maxPageSeen.current = pageNum;
               onPageChange(pageNum);
             }
             renderPage(pageNum, entry.target as HTMLDivElement);
          }
        }
      });
    }, { root: containerRef.current, rootMargin: '800px 0px' });

    const pageNodes = containerRef.current.querySelectorAll('.pdf-page');
    pageNodes.forEach(node => observer.observe(node));

    return () => observer.disconnect();
  }, [totalPages, scale]);

  useEffect(() => {
    if (totalPages > 0 && initialPage > 1 && containerRef.current) {
       setTimeout(() => {
          const el = containerRef.current?.querySelector(`.pdf-page[data-page="${initialPage}"]`);
          if (el) el.scrollIntoView();
       }, 300);
    }
  }, [totalPages]);

  async function renderPage(pageNum: number, wrapper: HTMLDivElement) {
    if (!pdfRef.current || renderLocks.current.has(pageNum)) return;
    if (wrapper.querySelector('canvas')) return;

    renderLocks.current.add(pageNum);
    try {
      const page = await pdfRef.current.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      
      wrapper.style.width = `${viewport.width}px`;
      wrapper.style.height = `${viewport.height}px`;

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.display = 'block';
      
      const textLayerDiv = document.createElement('div');
      textLayerDiv.className = 'textLayer';
      textLayerDiv.style.setProperty('--scale-factor', String(scale));

      wrapper.appendChild(canvas);
      wrapper.appendChild(textLayerDiv);
      
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const textContent = await page.getTextContent();
      const textLayer = new pdfjsLib.TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport: viewport
      });
      await textLayer.render();
      
      // Remove loading indicator once rendered successfully
      const loader = wrapper.querySelector('.pdf-loader');
      if (loader) loader.remove();
    } catch (e) {
      console.error(`Failed to render page ${pageNum}`, e);
    }
  }

  const estimatedHeight = Math.floor(scale * 800);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center' }}>
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', width: '100%', background: '#e2e8f0', padding: '24px 0', scrollBehavior: 'smooth' }}>
        {Array.from({ length: totalPages }).map((_, i) => (
          <div 
            key={i} 
            className="pdf-page" 
            data-page={i + 1} 
            style={{ 
              margin: '0 auto 24px auto', 
              position: 'relative', 
              backgroundColor: '#ffffff',
              boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
              minHeight: `${estimatedHeight}px`,
              width: '90%'
            }}
          >
            <div className="pdf-loader" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#94a3b8', fontSize: 13 }}>
              正在加载第 {i + 1} 页...
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
