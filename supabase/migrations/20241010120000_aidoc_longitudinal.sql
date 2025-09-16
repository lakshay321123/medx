-- Core patient table
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  name text,
  dob date,
  sex text
);

create index if not exists idx_patients_user on patients(user_id);

-- Vitals
create table if not exists vitals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  taken_at timestamptz not null,
  sbp numeric,
  dbp numeric,
  hr numeric,
  temp numeric,
  temp_unit text,
  spo2 numeric,
  weight_kg numeric,
  height_cm numeric,
  bmi numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_vitals_patient_time on vitals(patient_id, taken_at);

-- Labs
create table if not exists labs (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  taken_at timestamptz not null,
  test_code text not null,
  value numeric,
  unit text,
  ref_low numeric,
  ref_high numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_labs_patient_time on labs(patient_id, taken_at);
create index if not exists idx_labs_patient_code_time on labs(patient_id, test_code, taken_at);

-- Medications
create table if not exists medications (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  name text not null,
  dose text,
  route text,
  start_at timestamptz,
  end_at timestamptz,
  adherence_mark text,
  created_at timestamptz not null default now()
);

create index if not exists idx_meds_patient_start on medications(patient_id, start_at);

-- Encounters
create table if not exists encounters (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  type text,
  start_at timestamptz not null,
  dx_codes text[],
  created_at timestamptz not null default now()
);

create index if not exists idx_encounters_patient_start on encounters(patient_id, start_at);

-- Notes
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  created_at timestamptz not null default now(),
  text text not null,
  tags text[]
);

create index if not exists idx_notes_patient_time on notes(patient_id, created_at);

-- Predictions (domain-level)
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  generated_at timestamptz not null default now(),
  condition text not null,
  risk_score numeric not null,
  risk_label text not null,
  features jsonb,
  top_factors jsonb,
  model text not null,
  patient_summary_md text,
  clinician_summary_md text,
  summarizer_model text,
  summarizer_error text,
  meta jsonb
);

create index if not exists idx_predictions_patient_time on predictions(patient_id, generated_at desc);

-- Timeline events for auditability
create table if not exists timeline_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  type text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  meta jsonb
);

create index if not exists idx_timeline_patient_time on timeline_events(patient_id, occurred_at desc);

-- Enable RLS
alter table patients enable row level security;
alter table vitals enable row level security;
alter table labs enable row level security;
alter table medications enable row level security;
alter table encounters enable row level security;
alter table notes enable row level security;
alter table predictions enable row level security;
alter table timeline_events enable row level security;

drop policy if exists "patients_select_own" on patients;
create policy "patients_select_own" on patients
  for select using (user_id = auth.uid());
drop policy if exists "patients_modify_own" on patients;
create policy "patients_modify_own" on patients
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Helper expression for child tables
create or replace function patient_belongs_to_user(pid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from patients p
    where p.id = pid and p.user_id = auth.uid()
  );
$$;

drop policy if exists "vitals_select" on vitals;
create policy "vitals_select" on vitals
  for select using (patient_belongs_to_user(patient_id));
drop policy if exists "vitals_modify" on vitals;
create policy "vitals_modify" on vitals
  for all using (patient_belongs_to_user(patient_id))
  with check (patient_belongs_to_user(patient_id));

drop policy if exists "labs_select" on labs;
create policy "labs_select" on labs
  for select using (patient_belongs_to_user(patient_id));
drop policy if exists "labs_modify" on labs;
create policy "labs_modify" on labs
  for all using (patient_belongs_to_user(patient_id))
  with check (patient_belongs_to_user(patient_id));

drop policy if exists "meds_select" on medications;
create policy "meds_select" on medications
  for select using (patient_belongs_to_user(patient_id));
drop policy if exists "meds_modify" on medications;
create policy "meds_modify" on medications
  for all using (patient_belongs_to_user(patient_id))
  with check (patient_belongs_to_user(patient_id));

drop policy if exists "encounters_select" on encounters;
create policy "encounters_select" on encounters
  for select using (patient_belongs_to_user(patient_id));
drop policy if exists "encounters_modify" on encounters;
create policy "encounters_modify" on encounters
  for all using (patient_belongs_to_user(patient_id))
  with check (patient_belongs_to_user(patient_id));

drop policy if exists "notes_select" on notes;
create policy "notes_select" on notes
  for select using (patient_belongs_to_user(patient_id));
drop policy if exists "notes_modify" on notes;
create policy "notes_modify" on notes
  for all using (patient_belongs_to_user(patient_id))
  with check (patient_belongs_to_user(patient_id));

drop policy if exists "predictions_select" on predictions;
create policy "predictions_select" on predictions
  for select using (patient_belongs_to_user(patient_id));
drop policy if exists "predictions_insert" on predictions;
create policy "predictions_insert" on predictions
  for insert with check (patient_belongs_to_user(patient_id));
drop policy if exists "predictions_update" on predictions;
create policy "predictions_update" on predictions
  for update using (patient_belongs_to_user(patient_id))
  with check (patient_belongs_to_user(patient_id));

drop policy if exists "timeline_select" on timeline_events;
create policy "timeline_select" on timeline_events
  for select using (patient_belongs_to_user(patient_id));
drop policy if exists "timeline_insert" on timeline_events;
create policy "timeline_insert" on timeline_events
  for insert with check (patient_belongs_to_user(patient_id));
drop policy if exists "timeline_update" on timeline_events;
create policy "timeline_update" on timeline_events
  for update using (patient_belongs_to_user(patient_id))
  with check (patient_belongs_to_user(patient_id));
