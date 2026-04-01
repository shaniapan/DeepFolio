import { useEffect, useRef } from 'react';
import ePub, { type Rendition } from 'epubjs';

interface Props {
  url: string;
  initialCfi?: string;
  onLocationChange: (cfi: string) => void;
  onTextSelect: (text: string, cfi: string) => void;
}

export default function EpubReader({ url, initialCfi, onLocationChange, onTextSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const book = ePub(url);
    const rendition = book.renderTo(containerRef.current, {
      width: '100%', height: '100%', flow: 'scrolled-continuous'
    });
    renditionRef.current = rendition;

    rendition.display(initialCfi || undefined);

    rendition.on('relocated', (location: { start: { cfi: string } }) => {
      onLocationChange(location.start.cfi);
    });

    rendition.on('selected', (cfiRange: string, contents: { window: Window }) => {
      const selection = contents.window.getSelection();
      if (selection?.toString().trim()) {
        onTextSelect(selection.toString().trim(), cfiRange);
      }
    });

    return () => { rendition.destroy(); book.destroy(); };
  }, [url]);

  return (
    <div ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#fff', borderRadius: 8 }} />
  );
}
