import { createSql } from './db-client.mjs';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) throw new Error('DATABASE_URL is not set');

export const sql = createSql(url);
