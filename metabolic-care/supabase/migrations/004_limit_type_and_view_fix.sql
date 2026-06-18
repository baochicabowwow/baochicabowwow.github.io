-- Add limit_type to child_nutrient_targets
-- 'upper' = do not exceed (lysine in PDE, phe in PKU, leu in MSUD)
-- 'lower' = minimum required (certain vitamins, protein floors)
alter table public.child_nutrient_targets
  add column limit_type text not null
    check (limit_type in ('upper', 'lower'))
    default 'upper';

comment on column public.child_nutrient_targets.limit_type is
  'upper = do not exceed this amount (upper limit/restriction); lower = must reach this amount (minimum goal)';

-- Fix daily_nutrient_intake view.
-- Bug: computed_nutrients stores "lysine_mg", "protein_g" etc. but
-- child_nutrient_targets stores "lysine", "protein" etc.
-- The join was never matching. Strip the unit suffix to normalize the key.
create or replace view public.daily_nutrient_intake as
with intake as (
  select
    m.child_id,
    date(m.logged_at at time zone 'UTC') as log_date,
    -- Normalize "lysine_mg" → "lysine", "protein_g" → "protein", etc.
    regexp_replace(kv.key, '_(mg|g|kcal|amt)$', '') as nutrient_key,
    sum(kv.value::numeric) as total_amount
  from public.meals m
  join public.meal_items mi on mi.meal_id = m.id
  cross join lateral jsonb_each_text(mi.computed_nutrients) as kv(key, value)
  group by m.child_id, date(m.logged_at at time zone 'UTC'), regexp_replace(kv.key, '_(mg|g|kcal|amt)$', '')
),
active_targets as (
  select distinct on (t.child_id, t.nutrient_key)
    t.child_id,
    t.nutrient_key,
    t.basis,
    t.limit_type,
    t.daily_limit_amount,
    t.per_kg_amount,
    c.weight_kg,
    case
      when t.basis = 'per_kg' then t.per_kg_amount * c.weight_kg
      else t.daily_limit_amount
    end as effective_limit
  from public.child_nutrient_targets t
  join public.children c on c.id = t.child_id
  where t.effective_from <= current_date
    and (t.effective_to is null or t.effective_to >= current_date)
  order by t.child_id, t.nutrient_key, t.effective_from desc
)
select
  i.child_id,
  i.log_date,
  i.nutrient_key,
  i.total_amount,
  at.effective_limit,
  at.basis,
  at.limit_type,
  case
    when at.effective_limit > 0
    then round((i.total_amount / at.effective_limit * 100)::numeric, 1)
  end as percent_of_limit,
  -- within_limit means: under upper limit, OR at/above lower goal
  case
    when at.effective_limit is null then null
    when at.limit_type = 'lower' then i.total_amount >= at.effective_limit
    else i.total_amount <= at.effective_limit
  end as within_limit
from intake i
left join active_targets at
  on at.child_id = i.child_id
  and at.nutrient_key = i.nutrient_key;

grant select on public.daily_nutrient_intake to authenticated;
