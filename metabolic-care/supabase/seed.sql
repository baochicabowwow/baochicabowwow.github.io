-- Nutrient definitions
-- Add new metabolic disease nutrients here (e.g. phenylalanine for PKU, leucine for MSUD)
-- without any schema changes.
insert into public.nutrients (key, display_name, unit, sort_order) values
  ('lysine',         'Lysine',         'mg',   1),
  ('protein',        'Protein',        'g',    2),
  ('energy',         'Energy',         'kcal', 3),
  ('arginine',       'Arginine',       'mg',  10),
  ('threonine',      'Threonine',      'mg',  11),
  ('tryptophan',     'Tryptophan',     'mg',  12),
  ('phenylalanine',  'Phenylalanine',  'mg',  13),
  ('leucine',        'Leucine',        'mg',  14),
  ('isoleucine',     'Isoleucine',     'mg',  15),
  ('valine',         'Valine',         'mg',  16)
on conflict (key) do nothing;

-- Global foods with approximate lysine values (USDA FoodData Central)
-- These are shared across all care circles (care_circle_id IS NULL).
-- Import your dietitian's CSV for more accurate values specific to your products.
insert into public.foods (id, care_circle_id, name, brand, source, default_serving_g) values
  ('00000000-0000-0000-0000-000000000001', null, 'Chicken breast, cooked',   null, 'global', 85),
  ('00000000-0000-0000-0000-000000000002', null, 'Salmon, cooked',           null, 'global', 85),
  ('00000000-0000-0000-0000-000000000003', null, 'Whole milk',               null, 'global', 240),
  ('00000000-0000-0000-0000-000000000004', null, 'White rice, cooked',       null, 'global', 100),
  ('00000000-0000-0000-0000-000000000005', null, 'White bread, sliced',      null, 'global', 28),
  ('00000000-0000-0000-0000-000000000006', null, 'Apple, raw',               null, 'global', 182),
  ('00000000-0000-0000-0000-000000000007', null, 'Egg, whole, hard-boiled',  null, 'global', 50),
  ('00000000-0000-0000-0000-000000000008', null, 'Banana, raw',              null, 'global', 118),
  ('00000000-0000-0000-0000-000000000009', null, 'Oats, cooked',             null, 'global', 234),
  ('00000000-0000-0000-0000-000000000010', null, 'Sweet potato, cooked',     null, 'global', 100)
on conflict do nothing;

-- Nutrient values per 100g
-- lysine (mg), protein (g), energy (kcal)
insert into public.food_nutrients (food_id, nutrient_key, amount_per_100g) values
  -- Chicken breast cooked (~165 kcal, 31g protein, 2800mg lysine per 100g)
  ('00000000-0000-0000-0000-000000000001', 'lysine',   2800),
  ('00000000-0000-0000-0000-000000000001', 'protein',    31),
  ('00000000-0000-0000-0000-000000000001', 'energy',    165),
  -- Salmon cooked (~208 kcal, 25g protein, 2700mg lysine per 100g)
  ('00000000-0000-0000-0000-000000000002', 'lysine',   2700),
  ('00000000-0000-0000-0000-000000000002', 'protein',    25),
  ('00000000-0000-0000-0000-000000000002', 'energy',    208),
  -- Whole milk (~61 kcal, 3.3g protein, 260mg lysine per 100ml)
  ('00000000-0000-0000-0000-000000000003', 'lysine',    260),
  ('00000000-0000-0000-0000-000000000003', 'protein',   3.3),
  ('00000000-0000-0000-0000-000000000003', 'energy',     61),
  -- White rice cooked (~130 kcal, 2.7g protein, 100mg lysine per 100g)
  ('00000000-0000-0000-0000-000000000004', 'lysine',    100),
  ('00000000-0000-0000-0000-000000000004', 'protein',   2.7),
  ('00000000-0000-0000-0000-000000000004', 'energy',    130),
  -- White bread (~265 kcal, 9g protein, 170mg lysine per 100g)
  ('00000000-0000-0000-0000-000000000005', 'lysine',    170),
  ('00000000-0000-0000-0000-000000000005', 'protein',     9),
  ('00000000-0000-0000-0000-000000000005', 'energy',    265),
  -- Apple (~52 kcal, 0.3g protein, 16mg lysine per 100g)
  ('00000000-0000-0000-0000-000000000006', 'lysine',     16),
  ('00000000-0000-0000-0000-000000000006', 'protein',   0.3),
  ('00000000-0000-0000-0000-000000000006', 'energy',     52),
  -- Egg hard-boiled (~155 kcal, 13g protein, 900mg lysine per 100g)
  ('00000000-0000-0000-0000-000000000007', 'lysine',    900),
  ('00000000-0000-0000-0000-000000000007', 'protein',    13),
  ('00000000-0000-0000-0000-000000000007', 'energy',    155),
  -- Banana (~89 kcal, 1.1g protein, 60mg lysine per 100g)
  ('00000000-0000-0000-0000-000000000008', 'lysine',     60),
  ('00000000-0000-0000-0000-000000000008', 'protein',   1.1),
  ('00000000-0000-0000-0000-000000000008', 'energy',     89),
  -- Oats cooked (~71 kcal, 2.5g protein, 88mg lysine per 100g)
  ('00000000-0000-0000-0000-000000000009', 'lysine',     88),
  ('00000000-0000-0000-0000-000000000009', 'protein',   2.5),
  ('00000000-0000-0000-0000-000000000009', 'energy',     71),
  -- Sweet potato cooked (~90 kcal, 2g protein, 55mg lysine per 100g)
  ('00000000-0000-0000-0000-000000000010', 'lysine',     55),
  ('00000000-0000-0000-0000-000000000010', 'protein',     2),
  ('00000000-0000-0000-0000-000000000010', 'energy',     90)
on conflict do nothing;
