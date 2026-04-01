import { useRef, useState } from 'react';

interface Props { onUpload: (file: File) => Promise<void>; }

export default function BookUploader({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setLoading(true);
    try {
      for (const file of Array.from(files)) await onUpload(file);
    } finally { setLoading(false); }
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
      style={{
        border: '2px dashed #334155', borderRadius: 12, padding: 40,
        textAlign: 'center', cursor: 'pointer', color: '#64748b',
        transition: 'border-color .2s'
      }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{loading ? '⏳' : '📁'}</div>
      <p style={{ margin: 0, fontSize: 14 }}>
        {loading ? '上传中...' : '拖拽或点击上传 EPUB / PDF 文件'}
      </p>
      <input ref={inputRef} type="file" accept=".epub,.pdf,.txt"
        multiple hidden onChange={e => handleFiles(e.target.files)} />
    </div>
  );
}
