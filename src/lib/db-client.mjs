import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';

const localHosts = new Set(['db', 'localhost', '127.0.0.1', '::1', '[::1]']);

export function createSql(url) {
  const hostname = new URL(url).hostname;
  if (!localHosts.has(hostname)) return neon(url);

  const pool = new Pool({ connectionString: url });
  const sql = async (strings, ...values) => {
    const text = strings.reduce(
      (query, part, index) => query + (index ? `$${index}` : '') + part,
      '',
    );
    return (await pool.query(text, values)).rows;
  };
  sql.query = async (text, ...values) => (await pool.query(text, values)).rows;
  return sql;
}