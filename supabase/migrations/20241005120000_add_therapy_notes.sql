create table if not exists therapy_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),

  -- human summary (1–3 sentences)
  summary text not null,

  -- structured JSON: topics[], triggers[], emotions[], goals[]
  meta jsonb,

  -- optional one-word mood: anxious/hopeful/etc.
  mood text,

  -- short "breakthrough" line
  breakthrough text,

  -- next step suggested/accepted
  next_step text
);

create index if not exists idx_therapy_notes_user_created
  on therapy_notes(user_id, created_at desc);
