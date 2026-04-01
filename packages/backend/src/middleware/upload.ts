import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOKS_DIR = path.resolve(__dirname, '../../../../data/books');
fs.mkdirSync(BOOKS_DIR, { recursive: true });

export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, BOOKS_DIR),
    filename: (_req, file, cb) => {
      const id = crypto.randomUUID();
      const ext = path.extname(file.originalname);
      cb(null, `${id}${ext}`);
    }
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = ['.epub', '.pdf', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
  limits: { fileSize: 200 * 1024 * 1024 }
});
