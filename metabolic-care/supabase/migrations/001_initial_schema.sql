-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Profiles (mirrors auth.users, auto-created by trigger)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Care circles (family units)
create table public.care_circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Children
create table public.children (
  id uuid primary key default gen_random_uuid(),
  care_circle_id uuid not null references public.care_circles(id) on delete cascade,
  name text not null,
  date_of_birth date not null,
  weight_kg numeric(5,2),
  sex text check (sex in ('male','female','other')),
  conditions jsonb not null default '[]',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Circle members (role-based)
create table public.circle_members (
  id uuid primary key default gen_random_uuid(),
  care_circle_id uuid not null references public.care_circles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('primary','secondary')),
  permissions jsonb not null default '{"can_log":true,"can_view_analytics":true,"can_edit_targets":false,"can_manage_members":false,"can_edit_foods":false}',
  status text not null check (status in ('invited','active')) default 'active',
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(care_circle_id, user_id)
);

-- Invites for secondary caretakers
create table public.circle_invites (
  id uuid primary key default gen_random_uuid(),
  care_circle_id uuid not null references public.care_circles(id) on delete cascade,
  email text not null,
  role text not null check (role in ('primary','secondary')) default 'secondary',
  permissions jsonb not null default '{"can_log":true,"can_view_analytics":true,"can_edit_targets":false,"can_manage_members":false,"can_edit_foods":false}',
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Nutrients lookup (extensible: add PKU/phe, MSUD/leucine etc. without schema changes)
create table public.nutrients (
  key text primary key,
  display_name text not null,
  unit text not null,
  sort_order int not null default 100
);

-- Foods: global (care_circle_id IS NULL) + per-circle custom/CSV
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  care_circle_id uuid references public.care_circles(id) on delete cascade,
  name text not null,
  brand text,
  source text not null check (source in ('global','custom','csv')) default 'custom',
  default_serving_g numeric(8,2) not null default 100,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Nutrient amounts per food, normalized per 100g
-- Adding a new nutrient never requires a schema change
create table public.food_nutrients (
  food_id uuid not null references public.foods(id) on delete cascade,
  nutrient_key text not null references public.nutrients(key),
  amount_per_100g numeric(10,4) not null,
  primary key (food_id, nutrient_key)
);

-- Named servings for accurate portion entry
create table public.food_servings (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods(id) on delete cascade,
  label text not null,
  grams numeric(8,2) not null
);

-- Per-child nutrient targets (supports per-kg or absolute, with history)
create table public.child_nutrient_targets (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  nutrient_key text not null references public.nutrients(key),
  basis text not null check (basis in ('absolute','per_kg')) default 'absolute',
  daily_limit_amount numeric(10,4),
  per_kg_amount numeric(10,4),
  effective_from date not null default current_date,
  effective_to date,
  set_by uuid not null references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

-- Meals (grouped logging events)
create table public.meals (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  logged_by uuid not null references public.profiles(id),
  logged_at timestamptz not null default now(),
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack','formula','supplement')),
  note text,
  created_at timestamptz not null default now()
);

-- Meal items with nutrient snapshot
-- computed_nutrients is snapshotted at log time so history is immutable
-- (editing a food never rewrites past logs — clean ML features)
create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  food_id uuid not null references public.foods(id),
  amount_grams numeric(8,2) not null,
  computed_nutrients jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Extensible tracker events: diapers, medicine, activities, weight checks...
-- data jsonb carries the type-specific payload — no schema sprawl
create table public.tracker_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  type text not null,
  occurred_at timestamptz not null default now(),
  logged_by uuid not null references public.profiles(id),
  data jsonb not null default '{}',
  note text,
  created_at timestamptz not null default now()
);

-- Photos
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  storage_path text not null,
  caption text,
  taken_at timestamptz,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_children_circle on public.children(care_circle_id);
create index idx_circle_members_user on public.circle_members(user_id);
create index idx_circle_members_circle on public.circle_members(care_circle_id);
create index idx_meals_child_logged_at on public.meals(child_id, logged_at desc);
create index idx_meal_items_meal on public.meal_items(meal_id);
create index idx_tracker_events_child on public.tracker_events(child_id, type, occurred_at desc);
create index idx_photos_child on public.photos(child_id, created_at desc);
create index idx_child_targets_child on public.child_nutrient_targets(child_id, effective_from);
create index idx_foods_circle on public.foods(care_circle_id);
create index idx_food_nutrients_food on public.food_nutrients(food_id);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
