create table if not exists shared_answers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  conversation_id text not null,
  message_id text not null,
  mode text not null,
  research boolean default false,
  plain_text text not null,
  md_text text,
  created_at timestamptz default now()
);

create index if not exists idx_shared_answers_created
  on shared_answers(created_at desc);
