create table if not exists aidoc_conversation_state (
  user_id uuid not null,
  thread_id text not null,
  symptom_key text,
  symptom_text text,
  step text not null default 'idle',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, thread_id)
);

-- RLS: user can read/write their own row
