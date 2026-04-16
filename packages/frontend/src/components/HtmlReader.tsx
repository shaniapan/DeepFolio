import { useEffect, useRef, useState } from 'react';
import type { Annotation, ParagraphAnnotation } from '../api/client';

interface Props {
  url: string;
  initialScroll?: number;
  highlights?: Annotation[];
  paragraphAnnotations?: ParagraphAnnotation[];
  onScrollChange: (scrollTop: number) => void;
  onProgressChange?: (percent: number) => void;
  onTextSelect?: (text: string, position: string) => void;
  onHighlightClick?: (id: string, text: string, rect: DOMRect) => void;
}

const HIGHLIGHT_COLORS: Record<string, string> = {
  yellow: 'rgba(254, 240, 138, 0.6)',
  blue:   'rgba(147, 197, 253, 0.5)',
  green:  'rgba(134, 239, 172, 0.5)',
  red:    'rgba(252, 165, 165, 0.5)',
};

export default function HtmlReader({ url, initialScroll = 0, highlights = [], paragraphAnnotations = [], onScrollChange, onProgressChange, onTextSelect, onHighlightClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    fetch(url)
      .then(res => res.text())
      .then(html => {
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        let rawContent = bodyMatch ? bodyMatch[1] : html;
        rawContent = rawContent.replace(/<img /ig, '<img referrerpolicy="no-referrer" ');
        setContent(rawContent);
      });
  }, [url]);

  // 恢复滚动位置
  useEffect(() => {
    if (containerRef.current && initialScroll > 0) {
      setTimeout(() => {
        if (containerRef.current) containerRef.current.scrollTop = initialScroll;
      }, 150);
    }
  }, [content, initialScroll]);

  // 高亮复原：在 DOM 里用 TreeWalker 找到目标文字节点，用 <mark> 包裹
  useEffect(() => {
    if (!containerRef.current || !content) return;
    
    const t = setTimeout(() => {
      // 0. 清理旧的高亮和角标（解决“删除后仍在”的 Bug）
      const existingMarks = Array.from(containerRef.current!.querySelectorAll('mark.reader-highlight'));
      existingMarks.forEach(mark => {
        const parent = mark.parentNode;
        while (mark.firstChild) parent?.insertBefore(mark.firstChild, mark);
        parent?.removeChild(mark);
      });
      const existingAnchors = Array.from(containerRef.current!.querySelectorAll('.margin-anchor'));
      existingAnchors.forEach(a => a.remove());
      const existingBadges = Array.from(containerRef.current!.querySelectorAll('.reader-paragraph-badge'));
      existingBadges.forEach(b => b.remove());

      if (!highlights.length && !paragraphAnnotations.length) return;

      // 1. 恢复高亮
      highlights.forEach(h => {
        if (!h.selected_text || !containerRef.current) return;
        const bg = HIGHLIGHT_COLORS[h.color] || HIGHLIGHT_COLORS.yellow;
        const isNote = h.type === 'note' || h.note_content;
        applyHighlightToDOM(containerRef.current!, h.selected_text, bg, isNote ? '📌' : null, h.id);
      });
      // 2. 去重后插入段落角标
      const uniqueAnnotations = Array.from(new Map(paragraphAnnotations.map(p => [p.paragraph_text, p])).values());
      const injectedBlocks = new Set<HTMLElement>();
      uniqueAnnotations.forEach(p => {
        if (!p.paragraph_text || !containerRef.current) return;
        applyParagraphBadgeToDOM(containerRef.current!, p.paragraph_text, p.type, p.insight, injectedBlocks, p.id);
      });
    }, 150); // 加速渲染
    return () => clearTimeout(t);
  }, [content, highlights, paragraphAnnotations]);

  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim() && onTextSelect) {
        const pos = `scroll-${containerRef.current?.scrollTop || 0}`;
        onTextSelect(sel.toString().trim(), pos);
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [onTextSelect]);

  const scrollTimeout = useRef<NodeJS.Timeout>();
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const top = el.scrollTop;
    const max = Math.max(1, el.scrollHeight - el.clientHeight);
    const percent = Math.max(0, Math.min(1, top / max));

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      onScrollChange(top);
      if (onProgressChange) onProgressChange(percent);
    }, 1000);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // L3 Anchor点击穿透：点击边缘图钉，自动定位回正文段落
    if (target.closest('.margin-anchor')) {
      const anchor = target.closest('.margin-anchor') as HTMLElement;
      const id = anchor.dataset.id;
      const mark = containerRef.current?.querySelector(`.reader-highlight[data-id="${id}"]`) as HTMLElement;
      if (mark && onHighlightClick) {
         // Auto select text
         const selection = window.getSelection();
         if (selection) {
            const range = document.createRange();
            range.selectNodeContents(mark);
            selection.removeAllRanges();
            selection.addRange(range);
         }
         const rect = mark.getBoundingClientRect();
         onHighlightClick(id!, mark.textContent || '', rect);
      }
      return;
    }

    const mark = target.closest('.reader-highlight') as HTMLElement;
    if (mark && mark.dataset.id && onHighlightClick) {
      // 自动选中该段文本
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(mark);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      const rect = mark.getBoundingClientRect();
      onHighlightClick(mark.dataset.id, mark.textContent || '', rect);
    }
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      onClick={handleClick}
      style={{
        height: '100%',
        overflowY: 'auto',
        background: '#ffffff',
        color: '#1e293b',
        padding: '24px 40px',
        fontSize: '1.05rem',
        lineHeight: 1.8,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <style>{`
        .html-reader-content img { max-width: 100% !important; height: auto !important; object-fit: contain; margin: 24px auto; border-radius: 8px; display: block; }
        .html-reader-content iframe, .html-reader-content video { max-width: 100%; margin: 24px 0; }
        .html-reader-content p, .html-reader-content div, .html-reader-content section { overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; max-width: 100%; }
        .html-reader-content { line-height: 1.8; letter-spacing: 0.02em; }
        .html-reader-content h1 { font-size: 1.75em; padding-bottom: 0.5em; }
        .html-reader-content h2 { font-size: 1.5em; }
        .html-reader-content h3 { font-size: 1.25em; }
        .html-reader-content pre { overflow-x: auto; max-width: 100%; }
        mark.reader-highlight { border-radius: 3px; padding: 1px 0; cursor: default; transition: opacity 0.2s; }
        mark.reader-highlight:hover { opacity: 0.8; }
        .reader-paragraph-badge {
          display: inline-flex; position: relative; cursor: pointer; user-select: none;
          margin-right: 6px; vertical-align: top; margin-top: 2px;
        }
        .reader-paragraph-badge .icon {
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; background: #1e293b; border-radius: 4px;
          border: 1px solid #334155; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: transform 0.2s, background 0.2s;
        }
        .reader-paragraph-badge:hover .icon {
          transform: scale(1.1); background: #334155;
        }
        .reader-paragraph-badge .tooltip {
          position: absolute; left: 0; bottom: 100%; margin-bottom: 8px;
          background: #0f172a; border: 1px solid #3b82f6; border-radius: 8px;
          padding: 8px 12px; width: 240px; max-width: none; font-size: 13px; color: #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3); pointer-events: none;
          opacity: 0; transform: translateY(4px); transition: 0.2s; z-index: 100;
          line-height: 1.5; font-weight: normal; font-family: -apple-system, sans-serif;
          word-break: normal; white-space: normal;
        }
        .reader-paragraph-badge:hover .tooltip {
          opacity: 1; transform: translateY(0);
        }
        .margin-anchor {
          position: absolute; right: -32px; top: 2px; font-size: 14px; opacity: 0.4; cursor: pointer; transition: all 0.2s ease;
          user-select: none; z-index: 10; font-style: normal;
        }
        .margin-anchor:hover {
          opacity: 1; transform: scale(1.2);
        }
        .html-reader-content > * { position: relative; } /* Ensure block roots can anchor the margin objects */
      `}</style>
      <div
        className="html-reader-content"
        style={{ maxWidth: 800, margin: '0 auto' }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}

/** 用 TreeWalker 遍历文本节点，找到目标字串并用 <mark> 包裹，附带 L3 Margin Anchor */
function applyHighlightToDOM(container: HTMLElement, text: string, bgColor: string, icon: string | null = '📌', id: string | number = Math.random()) {
  if (!text.trim()) return;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const val = node.nodeValue ?? '';
    const idx = val.indexOf(text);
    if (idx === -1) continue;
    // 三段切割：前|目标|后
    const after = node.splitText(idx + text.length); // eslint-disable-line
    const match = node.splitText(idx);
    const mark = document.createElement('mark');
    mark.className = 'reader-highlight';
    mark.dataset.id = String(id);
    mark.style.background = bgColor;
    match.parentNode?.insertBefore(mark, match);
    mark.appendChild(match);
    
    // 如果有图标要求（代表是资产类 Note/Insight），则追加 L3 边缘持久锚点 (Margin Anchor)
    if (icon) {
      let parentBlock = match.parentElement;
      while (parentBlock && window.getComputedStyle(parentBlock).display === 'inline') {
        parentBlock = parentBlock.parentElement;
      }
      if (parentBlock && !parentBlock.querySelector(`.margin-anchor-id-${id}`)) {
        parentBlock.style.position = 'relative'; // 确保 relative 锚定
        const anchor = document.createElement('div');
        anchor.className = `margin-anchor margin-anchor-id-${id}`;
        anchor.dataset.id = String(id);
        anchor.title = '相关资产片段';
        anchor.innerHTML = icon;
        parentBlock.appendChild(anchor);
      }
    }
    
    break; // 每条记录只恢复第一处匹配
  }
}

/** 用纯文本匹配机制为段落容器插入角标，并附带用于导航的 ID */
function applyParagraphBadgeToDOM(container: HTMLElement, text: string, type: string, insight: string, injectedBlocks: Set<HTMLElement>, badgeId: string) {
  if (!text.trim()) return;
  const icons: Record<string, string> = { KEY: '🔑', HARD: '❓', LINK: '💡', BRIDGE: '🌉' };
  const icon = icons[type] || '✨';
  
  // 去除所有空白字符取前 20 字，提高匹配鲁棒性
  const searchStr = text.replace(/\s+/g, '').slice(0, 20); 
  if (!searchStr) return;

  const blocks = Array.from(container.querySelectorAll('p, div, section, h1, h2, h3, h4, h5, h6, li'));
  // 反向遍历：优先匹配最深层级的子元素，防止由最外层大包裹容器（如全局div）吞噬匹配
  for (let i = blocks.length - 1; i >= 0; i--) {
    const el = blocks[i] as HTMLElement;
    // 忽略本身就是作为容器包装器的宽泛 div（粗略策略：排除没有文本子节点的大容器）
    if (el.children.length > 5 && el.tagName === 'DIV') continue;

    const cleanText = (el.textContent || '').replace(/\s+/g, '');
    if (cleanText.includes(searchStr)) {
      // 不再用 querySelector 限制同一个段落多个洞见，因为它们可以并列
      const badge = document.createElement('span');
      badge.id = `badge-${badgeId}`;
      badge.className = 'reader-paragraph-badge';
      badge.contentEditable = 'false';
      badge.innerHTML = `<span class="icon">${icon}</span><div class="tooltip"><strong>AI 洞见：</strong><br/>${insight}</div>`;
      
      el.insertBefore(badge, el.firstChild);
      return; // 插入一次即结束
    }
  }
}
