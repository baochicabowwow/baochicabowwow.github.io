-- Daily nutrient intake view
-- Aggregates meal_items.computed_nutrients by child/day/nutrient
-- and joins against the child's current effective target.
--
-- ML seam: this view's output (child_id, log_date, nutrient_key,
-- total_amount, effective_limit, within_limit) can be exported
-- directly to a data warehouse as a feature table for prediction models.
create or replace view public.daily_nutrient_intake as
with intake as (
  select
    m.child_id,
    date(m.logged_at at time zone 'UTC') as log_date,
    kv.key as nutrient_key,
    sum(kv.value::numeric) as total_amount
  from public.meals m
  join public.meal_items mi on mi.meal_id = m.id
  cross join lateral jsonb_each_text(mi.computed_nutrients) as kv(key, value)
  group by m.child_id, date(m.logged_at at time zone 'UTC'), kv.key
),
active_targets as (
  -- Latest effective target per child/nutrient as of today
  select distinct on (t.child_id, t.nutrient_key)
    t.child_id,
    t.nutrient_key,
    t.basis,
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
  case
    when at.effective_limit > 0
    then round((i.total_amount / at.effective_limit * 100)::numeric, 1)
  end as percent_of_limit,
  case
    when at.effective_limit is not null
    then i.total_amount <= at.effective_limit
  end as within_limit
from intake i
left join active_targets at
  on at.child_id = i.child_id
  and at.nutrient_key = i.nutrient_key;

-- Grant access to authenticated users (RLS on underlying tables still applies)
grant select on public.daily_nutrient_intake to authenticated;
