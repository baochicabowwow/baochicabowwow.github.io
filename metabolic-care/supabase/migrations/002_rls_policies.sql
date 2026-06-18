-- Enable RLS on all user data tables
alter table public.profiles enable row level security;
alter table public.care_circles enable row level security;
alter table public.children enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_invites enable row level security;
alter table public.foods enable row level security;
alter table public.food_nutrients enable row level security;
alter table public.food_servings enable row level security;
alter table public.child_nutrient_targets enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.tracker_events enable row level security;
alter table public.photos enable row level security;
-- nutrients is a global read-only lookup, no RLS needed

-- Helper: is current user an active member of the given circle?
create or replace function public.is_circle_member(p_care_circle_id uuid)
returns boolean language sql security definer stable
as $$
  select exists(
    select 1 from public.circle_members
    where care_circle_id = p_care_circle_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

-- Helper: does current user have a specific permission in the circle?
-- Primary members always pass.
create or replace function public.has_permission(p_care_circle_id uuid, p_permission text)
returns boolean language sql security definer stable
as $$
  select exists(
    select 1 from public.circle_members
    where care_circle_id = p_care_circle_id
      and user_id = auth.uid()
      and status = 'active'
      and (
        role = 'primary'
        or (permissions->>p_permission)::boolean = true
      )
  );
$$;

-- Helper: is current user a primary member?
create or replace function public.is_circle_primary(p_care_circle_id uuid)
returns boolean language sql security definer stable
as $$
  select exists(
    select 1 from public.circle_members
    where care_circle_id = p_care_circle_id
      and user_id = auth.uid()
      and role = 'primary'
      and status = 'active'
  );
$$;

-- Profiles
create policy "profiles_select" on public.profiles for select
  using (
    id = auth.uid()
    or exists(
      select 1 from public.circle_members cm1
      join public.circle_members cm2 on cm1.care_circle_id = cm2.care_circle_id
      where cm1.user_id = auth.uid() and cm2.user_id = profiles.id
        and cm1.status = 'active' and cm2.status = 'active'
    )
  );
create policy "profiles_insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update using (id = auth.uid());

-- Care circles
create policy "care_circles_select" on public.care_circles for select
  using (public.is_circle_member(id));
create policy "care_circles_insert" on public.care_circles for insert
  with check (created_by = auth.uid());
create policy "care_circles_update" on public.care_circles for update
  using (public.is_circle_primary(id));

-- Children
create policy "children_select" on public.children for select
  using (public.is_circle_member(care_circle_id));
create policy "children_insert" on public.children for insert
  with check (
    public.is_circle_primary(care_circle_id)
    or public.has_permission(care_circle_id, 'can_edit_targets')
  );
create policy "children_update" on public.children for update
  using (
    public.is_circle_primary(care_circle_id)
    or public.has_permission(care_circle_id, 'can_edit_targets')
  );

-- Circle members
create policy "circle_members_select" on public.circle_members for select
  using (public.is_circle_member(care_circle_id) or user_id = auth.uid());
create policy "circle_members_insert" on public.circle_members for insert
  with check (
    public.is_circle_primary(care_circle_id)
    or public.has_permission(care_circle_id, 'can_manage_members')
  );
create policy "circle_members_update" on public.circle_members for update
  using (
    public.is_circle_primary(care_circle_id)
    or public.has_permission(care_circle_id, 'can_manage_members')
  );
create policy "circle_members_delete" on public.circle_members for delete
  using (
    user_id = auth.uid()
    or public.is_circle_primary(care_circle_id)
    or public.has_permission(care_circle_id, 'can_manage_members')
  );

-- Circle invites
create policy "invites_select" on public.circle_invites for select
  using (public.is_circle_member(care_circle_id) or created_by = auth.uid());
create policy "invites_insert" on public.circle_invites for insert
  with check (
    public.is_circle_primary(care_circle_id)
    or public.has_permission(care_circle_id, 'can_manage_members')
  );
create policy "invites_update" on public.circle_invites for update
  using (
    public.is_circle_primary(care_circle_id)
    or public.has_permission(care_circle_id, 'can_manage_members')
  );

-- Foods: global (care_circle_id IS NULL) readable by all authenticated users
create policy "foods_select" on public.foods for select
  using (
    care_circle_id is null
    or public.is_circle_member(care_circle_id)
  );
create policy "foods_insert" on public.foods for insert
  with check (
    care_circle_id is not null
    and (
      public.is_circle_primary(care_circle_id)
      or public.has_permission(care_circle_id, 'can_edit_foods')
    )
  );
create policy "foods_update" on public.foods for update
  using (
    care_circle_id is not null
    and (
      public.is_circle_primary(care_circle_id)
      or public.has_permission(care_circle_id, 'can_edit_foods')
    )
  );
create policy "foods_delete" on public.foods for delete
  using (
    care_circle_id is not null
    and (
      public.is_circle_primary(care_circle_id)
      or public.has_permission(care_circle_id, 'can_edit_foods')
    )
  );

-- Food nutrients
create policy "food_nutrients_select" on public.food_nutrients for select
  using (
    exists(
      select 1 from public.foods f
      where f.id = food_nutrients.food_id
        and (f.care_circle_id is null or public.is_circle_member(f.care_circle_id))
    )
  );
create policy "food_nutrients_write" on public.food_nutrients for insert
  with check (
    exists(
      select 1 from public.foods f
      where f.id = food_nutrients.food_id
        and f.care_circle_id is not null
        and (
          public.is_circle_primary(f.care_circle_id)
          or public.has_permission(f.care_circle_id, 'can_edit_foods')
        )
    )
  );
create policy "food_nutrients_update" on public.food_nutrients for update
  using (
    exists(
      select 1 from public.foods f
      where f.id = food_nutrients.food_id
        and f.care_circle_id is not null
        and (
          public.is_circle_primary(f.care_circle_id)
          or public.has_permission(f.care_circle_id, 'can_edit_foods')
        )
    )
  );
create policy "food_nutrients_delete" on public.food_nutrients for delete
  using (
    exists(
      select 1 from public.foods f
      where f.id = food_nutrients.food_id
        and f.care_circle_id is not null
        and (
          public.is_circle_primary(f.care_circle_id)
          or public.has_permission(f.care_circle_id, 'can_edit_foods')
        )
    )
  );

-- Food servings (same pattern as food_nutrients)
create policy "food_servings_select" on public.food_servings for select
  using (
    exists(
      select 1 from public.foods f
      where f.id = food_servings.food_id
        and (f.care_circle_id is null or public.is_circle_member(f.care_circle_id))
    )
  );
create policy "food_servings_write" on public.food_servings for insert
  with check (
    exists(
      select 1 from public.foods f
      where f.id = food_servings.food_id
        and f.care_circle_id is not null
        and (
          public.is_circle_primary(f.care_circle_id)
          or public.has_permission(f.care_circle_id, 'can_edit_foods')
        )
    )
  );

-- Child nutrient targets
create policy "targets_select" on public.child_nutrient_targets for select
  using (
    exists(
      select 1 from public.children c
      where c.id = child_nutrient_targets.child_id
        and public.is_circle_member(c.care_circle_id)
    )
  );
create policy "targets_insert" on public.child_nutrient_targets for insert
  with check (
    exists(
      select 1 from public.children c
      where c.id = child_nutrient_targets.child_id
        and (
          public.is_circle_primary(c.care_circle_id)
          or public.has_permission(c.care_circle_id, 'can_edit_targets')
        )
    )
  );
create policy "targets_update" on public.child_nutrient_targets for update
  using (
    exists(
      select 1 from public.children c
      where c.id = child_nutrient_targets.child_id
        and (
          public.is_circle_primary(c.care_circle_id)
          or public.has_permission(c.care_circle_id, 'can_edit_targets')
        )
    )
  );

-- Meals
create policy "meals_select" on public.meals for select
  using (
    exists(
      select 1 from public.children c
      where c.id = meals.child_id and public.is_circle_member(c.care_circle_id)
    )
  );
create policy "meals_insert" on public.meals for insert
  with check (
    logged_by = auth.uid()
    and exists(
      select 1 from public.children c
      where c.id = meals.child_id
        and public.has_permission(c.care_circle_id, 'can_log')
    )
  );
create policy "meals_delete" on public.meals for delete
  using (
    logged_by = auth.uid()
    or exists(
      select 1 from public.children c
      where c.id = meals.child_id and public.is_circle_primary(c.care_circle_id)
    )
  );

-- Meal items
create policy "meal_items_select" on public.meal_items for select
  using (
    exists(
      select 1 from public.meals m
      join public.children c on c.id = m.child_id
      where m.id = meal_items.meal_id and public.is_circle_member(c.care_circle_id)
    )
  );
create policy "meal_items_insert" on public.meal_items for insert
  with check (
    exists(
      select 1 from public.meals m
      join public.children c on c.id = m.child_id
      where m.id = meal_items.meal_id
        and public.has_permission(c.care_circle_id, 'can_log')
    )
  );
create policy "meal_items_delete" on public.meal_items for delete
  using (
    exists(
      select 1 from public.meals m
      join public.children c on c.id = m.child_id
      where m.id = meal_items.meal_id
        and (m.logged_by = auth.uid() or public.is_circle_primary(c.care_circle_id))
    )
  );

-- Tracker events
create policy "tracker_events_select" on public.tracker_events for select
  using (
    exists(
      select 1 from public.children c
      where c.id = tracker_events.child_id and public.is_circle_member(c.care_circle_id)
    )
  );
create policy "tracker_events_insert" on public.tracker_events for insert
  with check (
    logged_by = auth.uid()
    and exists(
      select 1 from public.children c
      where c.id = tracker_events.child_id
        and public.has_permission(c.care_circle_id, 'can_log')
    )
  );
create policy "tracker_events_delete" on public.tracker_events for delete
  using (
    logged_by = auth.uid()
    or exists(
      select 1 from public.children c
      where c.id = tracker_events.child_id and public.is_circle_primary(c.care_circle_id)
    )
  );

-- Photos
create policy "photos_select" on public.photos for select
  using (
    exists(
      select 1 from public.children c
      where c.id = photos.child_id and public.is_circle_member(c.care_circle_id)
    )
  );
create policy "photos_insert" on public.photos for insert
  with check (
    uploaded_by = auth.uid()
    and exists(
      select 1 from public.children c
      where c.id = photos.child_id
        and public.has_permission(c.care_circle_id, 'can_log')
    )
  );
create policy "photos_delete" on public.photos for delete
  using (
    uploaded_by = auth.uid()
    or exists(
      select 1 from public.children c
      where c.id = photos.child_id and public.is_circle_primary(c.care_circle_id)
    )
  );
