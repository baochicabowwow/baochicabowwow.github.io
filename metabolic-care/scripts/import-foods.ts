/**
 * Bulk food import script — runs with Node.js + service role key.
 * Never bundled into the app; SUPABASE_SERVICE_ROLE_KEY stays server-side only.
 *
 * Usage:
 *   cp .env.example .env   # fill in your keys
 *   npm run import-foods -- --file data/foods.sample.csv
 *   npm run import-foods -- --file /path/to/dietitian-lysine-data.csv
 */
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import 'dotenv/config';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role bypasses RLS for seeding
);

const RowSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  lysine_mg_per_100g: z.coerce.number().nonnegative(),
  protein_g_per_100g: z.coerce.number().nonnegative().optional(),
  energy_kcal_per_100g: z.coerce.number().nonnegative().optional(),
  default_serving_g: z.coerce.number().positive().optional(),
});
type Row = z.infer<typeof RowSchema>;

async function main() {
  const args = process.argv.slice(2);
  const fileIdx = args.indexOf('--file');
  const filePath = fileIdx >= 0 ? args[fileIdx + 1] : 'data/foods.sample.csv';

  if (!filePath || !fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Importing from: ${path.resolve(filePath)}`);
  const text = fs.readFileSync(filePath, 'utf-8');
  const { data, errors: parseErrors } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseErrors.length) {
    console.warn('CSV parse warnings:', parseErrors);
  }

  let ok = 0;
  let skipped = 0;

  for (const raw of data) {
    const result = RowSchema.safeParse(raw);
    if (!result.success) {
      console.warn(`Skipping invalid row [${raw['name'] ?? '?'}]:`, result.error.errors[0]?.message);
      skipped++;
      continue;
    }
    const row: Row = result.data;

    // Upsert food (global — care_circle_id IS NULL)
    const { data: food, error: foodError } = await supabase
      .from('foods')
      .upsert(
        {
          care_circle_id: null,
          name: row.name,
          brand: row.brand ?? null,
          source: 'global',
          default_serving_g: row.default_serving_g ?? 100,
        },
        { onConflict: 'name,care_circle_id' },
      )
      .select('id')
      .single();

    if (foodError || !food) {
      console.error(`Failed to upsert food [${row.name}]:`, foodError?.message);
      skipped++;
      continue;
    }

    // Upsert nutrients
    const nutrients = [
      { food_id: food.id, nutrient_key: 'lysine', amount_per_100g: row.lysine_mg_per_100g },
    ];
    if (row.protein_g_per_100g != null)
      nutrients.push({ food_id: food.id, nutrient_key: 'protein', amount_per_100g: row.protein_g_per_100g });
    if (row.energy_kcal_per_100g != null)
      nutrients.push({ food_id: food.id, nutrient_key: 'energy', amount_per_100g: row.energy_kcal_per_100g });

    const { error: nutrientError } = await supabase
      .from('food_nutrients')
      .upsert(nutrients, { onConflict: 'food_id,nutrient_key' });

    if (nutrientError) {
      console.error(`Failed to upsert nutrients for [${row.name}]:`, nutrientError.message);
      skipped++;
      continue;
    }

    console.log(`  ✓ ${row.name} (lysine: ${row.lysine_mg_per_100g} mg/100g)`);
    ok++;
  }

  console.log(`\nDone: ${ok} imported, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
