const BASE = 'http://localhost:3001/api';

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    let errMsg = `API error: ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) errMsg = data.error;
    } catch (e) {
      // Ignored
    }
    throw new Error(errMsg);
  }
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
    uploadUrl: (url: string) => {
      return req<Book>('/books/url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    },
    delete: (id: string) => req(`/books/${id}`, { method: 'DELETE' }),
  },
  progress: {
    get: (bookId: string) => req<Progress>(`/books/${bookId}/progress`),
    set: (bookId: string, data: Partial<Progress>) =>
      req(`/books/${bookId}/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
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
  conversations: {
    list: (bookId: string) => req<Conversation[]>(`/books/${bookId}/conversations`),
    create: (bookId: string, data: Omit<Conversation, 'id' | 'book_id' | 'created_at'>) =>
      req(`/books/${bookId}/conversations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  highlights: {
    list: (bookId: string) => req<Annotation[]>(`/books/${bookId}/highlights`),
    create: (bookId: string, data: Partial<Annotation>) =>
      req(`/books/${bookId}/highlights`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
  },
  settings: {
    get: () => req<Record<string, string>>('/settings'),
    set: (data: Record<string, string>) =>
      req('/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    mergeProfile: (bookGoal: string) =>
      req('/settings/merge-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookGoal }) }),
  },
  paragraphs: {
    list: (bookId: string) => req<ParagraphAnnotation[]>(`/books/${bookId}/paragraphs`),
    generate: (bookId: string, progress?: number) =>
      req<{ ok: boolean; status: string }>(`/books/${bookId}/paragraphs/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      }),
  },
  ai: {
    ask: (bookId: string, action: string, text: string, history: Array<{role: string, content: string}>) =>
      req<{ reply: string }>('/ai/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookId, action, text, history }) }),
  }
};

export interface Book {
  id: string; title: string; author?: string;
  format: 'epub' | 'pdf' | 'txt' | 'html'; filename: string;
  summary?: string;
  has_text_layer?: number;
  cover_url?: string; created_at: number;
}
export interface Progress {
  book_id: string; position: string; last_mode: string; updated_at: number;
}
export interface Annotation {
  id: string; book_id: string; type: string;
  position: string; selected_text: string; color: string;
  note_content?: string; chapter?: string; created_at: number;
}
export interface ParagraphAnnotation {
  id: string; book_id: string; paragraph_index: number;
  paragraph_text: string; type: 'KEY' | 'HARD' | 'LINK' | 'BRIDGE';
  insight: string; created_at: number;
}
export interface Conversation {
  id: string; book_id: string; session_id: string;
  role: 'user' | 'assistant'; content: string; created_at: number;
}

