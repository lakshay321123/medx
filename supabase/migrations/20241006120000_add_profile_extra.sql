alter table profiles
  add column if not exists profile_extra jsonb;
