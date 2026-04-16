import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import booksRouter from '../routes/books.js';
import { db } from '../db/index.js';

const app = express();
app.use(express.json());
app.use('/api/books', booksRouter);

describe('Books API', () => {
  it('GET /api/books should return empty array initially', async () => {
    const res = await request(app).get('/api/books');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/books should upload a file and insert to db', async () => {
    // Create a dummy text file
    const res = await request(app)
      .post('/api/books')
      .attach('file', Buffer.from('hello world'), 'test.txt');
    
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('test');
    expect(res.body.format).toBe('txt');
    expect(res.body.has_text_layer).toBe(1);

    const progress = db.prepare('SELECT * FROM reading_progress WHERE book_id = ?').get(res.body.id);
    expect(progress).toBeDefined();
  });

  it('DELETE /api/books/:id should delete a book', async () => {
    const uploadRes = await request(app)
      .post('/api/books')
      .attach('file', Buffer.from('hello world epub'), 'test.epub');
    
    const id = uploadRes.body.id;
    const deleteRes = await request(app).delete(`/api/books/${id}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.ok).toBe(true);
    
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    expect(book).toBeUndefined();
  });
});
