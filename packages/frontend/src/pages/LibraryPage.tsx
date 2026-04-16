import { useEffect, useState } from 'react';
import { api, type Book } from '../api/client';
import TopBar from '../components/TopBar';
import BookCard from '../components/BookCard';
import BookUploader from '../components/BookUploader';

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);

  async function load() { setBooks(await api.books.list()); }

  useEffect(() => { load(); }, []);

  async function handleUpload(file: File) {
    const newBook = await api.books.upload(file);
    if (newBook.has_text_layer === 0) {
      alert("⚠️ 提示：\n该 PDF 被检测为没有文本层的纯图片扫描版。\n为了不阻塞您的设备，针对此书的后台 AI 预处理管线已被关闭。\n您可以进行基础翻页阅读，但高级划词与联想提问功能将受限。");
    }
    await load();
  }

  async function handleUploadUrl(url: string) {
    await api.books.uploadUrl(url);
    await load();
  }

  async function handleDelete(id: string) {
    await api.books.delete(id);
    setBooks(b => b.filter(x => x.id !== id));
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e' }}>
      <TopBar />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 22, marginBottom: 24 }}>我的书库</h1>
        <BookUploader onUpload={handleUpload} onUploadUrl={handleUploadUrl} />
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 16, marginTop: 24
        }}>
          {books.map(b => <BookCard key={b.id} book={b} onDelete={handleDelete} />)}
        </div>
      </main>
    </div>
  );
}
