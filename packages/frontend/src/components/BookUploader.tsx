import { useRef, useState, KeyboardEvent } from 'react';

interface Props {
  onUpload: (file: File) => Promise<void>;
  onUploadUrl: (url: string) => Promise<void>;
}

export default function BookUploader({ onUpload, onUploadUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setLoading(true);
    try {
      for (const file of Array.from(files)) await onUpload(file);
    } finally { setLoading(false); }
  }
  
  async function handleUrlKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && urlInput.trim()) {
      setLoading(true);
      try {
        await onUploadUrl(urlInput.trim());
        setUrlInput('');
      } catch (err: any) {
        alert('抓取失败: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <input
        type="text"
        placeholder="粘贴长文链接（如 微信公众号/知乎/Substack），按回车一键萃取..."
        value={urlInput}
        onChange={e => setUrlInput(e.target.value)}
        onKeyDown={handleUrlKeyDown}
        disabled={loading}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 8,
          background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9',
          outline: 'none', fontSize: 14,
          boxSizing: 'border-box'
        }}
      />
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
          {loading ? '处理中...' : '拖拽或点击上传本地 EPUB / PDF 文件'}
        </p>
        <input ref={inputRef} type="file" accept=".epub,.pdf,.txt"
          multiple hidden onChange={e => handleFiles(e.target.files)} />
      </div>
    </div>
  );
}
