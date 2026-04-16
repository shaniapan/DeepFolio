import { beforeAll } from 'vitest';
import { runMigrations } from '../db/migrate.js';
import { db } from '../db/index.js';

beforeAll(() => {
  // Execute migrations on the in-memory database before running tests
  runMigrations();
});
