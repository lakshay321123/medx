-- Enum
create type memory_scope as enum ('global','thread');

-- Table
create table if not exists medx_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope memory_scope not null default 'global',
  thread_id text,
  key text not null,
  value jsonb not null,
  source text not null default 'manual',
  confidence real not null default 0.8,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

-- Uniqueness (separate for global vs thread)
create unique index if not exists idx_memory_unique_global
  on medx_memory (user_id, scope, key)
  where thread_id is null;

create unique index if not exists idx_memory_unique_thread
  on medx_memory (user_id, scope, thread_id, key)
  where thread_id is not null;

-- Helpful indexes
create index if not exists idx_memory_user_scope
  on medx_memory (user_id, scope);

create index if not exists idx_memory_user_thread
  on medx_memory (user_id, thread_id);
