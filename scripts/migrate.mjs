// Creates the isolated `roadmap` schema. Safe to re-run.
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Put it in .env.local.');
  process.exit(1);
}
const sql = neon(url);

const statements = [
  `create schema if not exists roadmap`,

  `create table if not exists roadmap.users (
     id            uuid primary key default gen_random_uuid(),
     email         text not null,
     email_lower   text generated always as (lower(email)) stored,
     password_hash text not null,
     business_name text,
     created_at    timestamptz not null default now()
   )`,
  `create unique index if not exists users_email_lower_idx on roadmap.users (email_lower)`,

  `create table if not exists roadmap.sessions (
     token      text primary key,
     user_id    uuid not null references roadmap.users(id) on delete cascade,
     created_at timestamptz not null default now(),
     expires_at timestamptz not null
   )`,
  `create index if not exists sessions_user_idx on roadmap.sessions (user_id)`,

  `create table if not exists roadmap.placements (
     user_id     uuid primary key references roadmap.users(id) on delete cascade,
     answers     jsonb not null default '{}'::jsonb,
     stage       int,
     shape_stage int,
     work_stage  int,
     placed_at   timestamptz not null default now()
   )`,

  `create table if not exists roadmap.progress (
     user_id    uuid not null references roadmap.users(id) on delete cascade,
     step_id    text not null,
     stage      int  not null,
     checked    jsonb not null default '[]'::jsonb,
     evidence   text  not null default '',
     status     text  not null default 'in_progress',
     review     jsonb,
     updated_at timestamptz not null default now(),
     primary key (user_id, step_id)
   )`,
  `create index if not exists progress_user_stage_idx on roadmap.progress (user_id, stage)`,
];

for (const s of statements) {
  await sql.query(s);
  console.log('ok  ', s.split('\n')[0].trim().slice(0, 72));
}

const t = await sql`select table_name from information_schema.tables
                    where table_schema = 'roadmap' order by table_name`;
console.log('\nroadmap schema tables:', t.map((r) => r.table_name).join(', '));
