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
    await api.books.upload(file);
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
        <BookUploader onUpload={handleUpload} />
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
