-- Hotfix to restore compatibility with legacy user-based filters in dev
alter table if exists public.patients
  add column if not exists user_id uuid;

create index if not exists idx_patients_user
  on public.patients(user_id);

alter table if exists public.predictions
  add column if not exists user_id uuid;

create or replace function public.pred_sync_user_id()
returns trigger
language plpgsql
as $$
begin
  if new.patient_id is not null then
    select p.user_id into new.user_id
    from public.patients p
    where p.id = new.patient_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pred_sync_user_id on public.predictions;
create trigger trg_pred_sync_user_id
before insert or update of patient_id on public.predictions
for each row
execute function public.pred_sync_user_id();

update public.predictions pr
set user_id = p.user_id
from public.patients p
where pr.patient_id = p.id
  and (pr.user_id is distinct from p.user_id or pr.user_id is null);

create index if not exists idx_predictions_user_time
  on public.predictions(user_id, generated_at desc);
