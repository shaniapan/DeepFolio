import fs from 'fs';
import path from 'path';
import { db } from './index.js';

const DATA_DIR = path.resolve(process.cwd(), '../../data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS = 5;

export function triggerBackup() {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest = path.join(BACKUP_DIR, `reader-${timestamp}.db`);

    // SQLite backup API — 原子性、一致性保证
    (db as any).backup(dest).then(() => {
      pruneOldBackups();
      console.log(`[Backup] 已保存快照: ${path.basename(dest)}`);
    }).catch((err: Error) => {
      console.error('[Backup] 快照失败:', err.message);
    });
  } catch (err: any) {
    console.error('[Backup] 初始化备份目录失败:', err.message);
  }
}

function pruneOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('reader-') && f.endsWith('.db'))
    .sort(); // ISO时间戳天然按时间排序

  if (files.length > MAX_BACKUPS) {
    const toDelete = files.slice(0, files.length - MAX_BACKUPS);
    toDelete.forEach(f => {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`[Backup] 清理旧快照: ${f}`);
    });
  }
}
