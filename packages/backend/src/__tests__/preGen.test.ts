import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../db/index.js';
// Mock before importing
vi.mock('../services/ai/adapter.js', () => ({
  callAI: vi.fn().mockResolvedValue(`{"annotations": [{"index":0,"type":"KEY","insight":"Mock insight"}]}`)
}));

import { preGenerateParagraphAnnotations } from '../services/preGenerator.js';
import { callAI } from '../services/ai/adapter.js';

describe('PreGenerator Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.prepare('DELETE FROM books').run();
    db.prepare('DELETE FROM settings').run();
    db.prepare("INSERT INTO settings (key, value) VALUES ('active_model', 'openai'), ('api_key_openai', 'test')").run();
  });

  it('Track 1/2 Check: Should skip if has_text_layer is 0', async () => {
    db.prepare("INSERT INTO books (id, title, format, filename, has_text_layer) VALUES ('b1', 'Test', 'pdf', 'test.pdf', 0)").run();
    
    await preGenerateParagraphAnnotations('b1', '<p>Paragraph 1</p>');
    
    // AI should not be called since book has no text layer
    expect(callAI).toHaveBeenCalledTimes(0);
  });

  it('Should generate annotations and save them for valid book', async () => {
    db.prepare("INSERT INTO books (id, title, format, filename, has_text_layer) VALUES ('b2', 'Test', 'epub', 'test.epub', 1)").run();
    
    await preGenerateParagraphAnnotations('b2', '<p>This is a sufficiently long paragraph that has more than fifty characters so that it gets extracted and processed.</p><p>This is another sufficiently long paragraph that has more than fifty characters so that it is included.</p>');
    
    expect(callAI).toHaveBeenCalledTimes(1);
    const annots = db.prepare("SELECT * FROM paragraph_annotations WHERE book_id = 'b2'").all();
    expect(annots.length).toBe(1);
  });
});
