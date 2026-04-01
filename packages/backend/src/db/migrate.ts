import { db } from './index.js';
import { SCHEMA } from './schema.js';

export function runMigrations() {
  db.exec(SCHEMA);
  console.log('[DB] Migrations complete');
}
