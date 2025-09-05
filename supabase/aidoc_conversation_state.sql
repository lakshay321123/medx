create table if not exists aidoc_conversation_state (
  user_id uuid not null,
  thread_id text not null,
  episode_id uuid default gen_random_uuid(),
  step text not null default 'idle',
  symptom_key text,
  symptom_text text,
  collected jsonb default '{}'::jsonb,
  flags_prompt_count int not null default 0,
  followup_prompt_count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, thread_id)
);

-- RLS: user can read/write their own row
