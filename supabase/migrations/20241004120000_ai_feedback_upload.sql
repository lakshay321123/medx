-- safe to rerun; ignore if already present
alter table public.ai_feedback
  add column if not exists pending_upload boolean not null default false,
  add column if not exists uploaded_file_id text;

create index if not exists idx_ai_feedback_pending
  on public.ai_feedback (pending_upload);
