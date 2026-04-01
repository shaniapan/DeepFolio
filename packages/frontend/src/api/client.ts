const BASE = 'http://localhost:3001/api';

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  books: {
    list: () => req<Book[]>('/books'),
    upload: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return req<Book>('/books', { method: 'POST', body: fd });
    },
    delete: (id: string) => req(`/books/${id}`, { method: 'DELETE' }),
  },
  progress: {
    get: (bookId: string) => req<Progress>(`/books/${bookId}/progress`),
    set: (bookId: string, data: Partial<Progress>) =>
      req(`/books/${bookId}/progress`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  annotations: {
    list: (bookId: string) => req<Annotation[]>(`/books/${bookId}/annotations`),
    create: (bookId: string, data: Omit<Annotation, 'id' | 'book_id' | 'created_at'>) =>
      req(`/books/${bookId}/annotations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    delete: (bookId: string, annotationId: string) =>
      req(`/books/${bookId}/annotations/${annotationId}`, { method: 'DELETE' }),
    export: (bookId: string) =>
      req<{ ok: boolean; file: string }>(`/books/${bookId}/export`, { method: 'POST' }),
  },
  settings: {
    get: () => req<Record<string, string>>('/settings'),
    set: (data: Record<string, string>) =>
      req('/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
};

export interface Book {
  id: string; title: string; author?: string;
  format: 'epub' | 'pdf' | 'txt'; filename: string;
  cover_url?: string; created_at: number;
}
export interface Progress {
  book_id: string; position: string; last_mode: string; updated_at: number;
}
export interface Annotation {
  id: string; book_id: string; type: 'highlight' | 'note';
  position: string; selected_text: string; color: string;
  note_content?: string; chapter?: string; created_at: number;
}
