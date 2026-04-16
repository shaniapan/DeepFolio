import { db } from './index.js';
import { SCHEMA } from './schema.js';

export function runMigrations() {
  db.exec(SCHEMA);
  try {
    db.exec(`ALTER TABLE books ADD COLUMN summary TEXT`);
  } catch (err: any) {
    if (!err.message.includes('duplicate column name')) console.error('[DB] Migration error adding summary column:', err);
  }
  try {
    db.exec(`ALTER TABLE books ADD COLUMN has_text_layer INTEGER DEFAULT 1`);
  } catch (err: any) {
    if (!err.message.includes('duplicate column name')) console.error('[DB] Migration error adding has_text_layer column:', err);
  }
  console.log('[DB] Migrations complete');
}
