-- Medications: a persistent list of medications for each child.
-- Dose logging uses tracker_events (type='medicine', data contains medication_id + dose_given).

create table public.medications (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid not null references public.children(id) on delete cascade,
  name       text not null,
  dose       text not null,                    -- e.g. "5", "0.5"
  unit       text not null default 'mg',       -- mg, mL, tablet, drops, etc.
  frequency  text,                             -- "twice daily", "as needed", etc.
  notes      text,
  active     boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.medications(child_id);

alter table public.medications enable row level security;

create policy "circle members can view medications"
  on public.medications for select
  using (
    exists (
      select 1 from public.children ch
      join public.circle_members cm on cm.care_circle_id = ch.care_circle_id
      where ch.id = medications.child_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
    )
  );

create policy "circle members with can_log can insert medications"
  on public.medications for insert
  with check (
    exists (
      select 1 from public.children ch
      join public.circle_members cm on cm.care_circle_id = ch.care_circle_id
      where ch.id = medications.child_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and (cm.permissions->>'can_log')::boolean = true
    )
  );

create policy "circle members with can_log can update medications"
  on public.medications for update
  using (
    exists (
      select 1 from public.children ch
      join public.circle_members cm on cm.care_circle_id = ch.care_circle_id
      where ch.id = medications.child_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and (cm.permissions->>'can_log')::boolean = true
    )
  );

create policy "circle members with can_log can delete medications"
  on public.medications for delete
  using (
    exists (
      select 1 from public.children ch
      join public.circle_members cm on cm.care_circle_id = ch.care_circle_id
      where ch.id = medications.child_id
        and cm.user_id = auth.uid()
        and cm.status = 'active'
        and (cm.permissions->>'can_log')::boolean = true
    )
  );

grant select, insert, update, delete on public.medications to authenticated;
