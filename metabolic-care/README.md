# Metabolic Care

A React Native / Expo app for tracking diet, lysine intake, and daily care for children with metabolic and rare diseases — starting with **Pyridoxine-Dependent Epilepsy (PDE/ALDH7A1)**.

**Platforms:** iOS · Android · Web (one codebase)  
**Backend:** Supabase (Postgres + Auth + Storage + Row-Level Security)

---

## Features

- **Lysine tracking** — accurate per-meal calculation snapshotted at log time (historical data never changes when you edit a food)
- **Per-kg or absolute targets** — e.g. 100 mg lysine/kg/day × current weight, recalculated live
- **CSV import** — two paths: in-app picker or the `import-foods` script for bulk dietitian data
- **Care circle** — primary caretaker + secondary caretakers with granular permissions enforced by Postgres RLS
- **Analytics** — daily intake vs. target trend chart; SQL view exportable to a warehouse for future ML
- **Extensible trackers** — diaper, medicine, activity on a shared `tracker_events` table (new types need no schema change)
- **Photos** — stored in Supabase Storage, tied to care circle membership

---

## Quick start

### 1. Supabase setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run migrations in order in the SQL editor:
   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_rls_policies.sql
   supabase/migrations/003_analytics_views.sql
   ```
3. Run the seed data:
   ```
   supabase/seed.sql
   ```
4. In **Storage**, create a bucket named `photos` (private, with RLS)
5. Copy your project URL and anon key from **Settings > API**

### 2. App setup

```bash
cd metabolic-care
cp .env.example .env
# Edit .env — fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

npm install
npx expo start
```

Open in Expo Go (iOS/Android) or press `w` for web.

### 3. Seed your food database

Using the in-app CSV import (Diet → Import CSV), or with the script:

```bash
# Also add SUPABASE_SERVICE_ROLE_KEY to .env
npm run import-foods -- --file data/foods.sample.csv

# Or load your dietitian's file:
npm run import-foods -- --file /path/to/my-lysine-data.csv
```

CSV format:
```
name,brand,lysine_mg_per_100g,protein_g_per_100g,energy_kcal_per_100g,default_serving_g
```
Only `name` and `lysine_mg_per_100g` are required.

---

## Architecture

```
metabolic-care/
  app/                   # Expo Router file-based routes
    (auth)/              # sign-in, sign-up
    (app)/               # tabs: Today, Diet, Children, Analytics, Settings
      diet/              # meal logger, food search, CSV import
      children/          # profiles, weight, lysine targets
      analytics/         # trend charts
      trackers/          # diaper / medicine / activity (stub)
      settings/          # care circle members + invite
  src/
    domain/nutrition/    # PURE calculation engine + unit tests
    features/            # React Query hooks per domain
    lib/                 # supabase client, queryClient, env, database.types
    components/ui/       # design system: Button, Card, Input, Text, ProgressBar
  supabase/migrations/   # Schema, RLS policies, analytics view
  scripts/import-foods   # Node CLI for bulk CSV import
  data/foods.sample.csv  # sample food data
```

### Data design key decisions

| Decision | Rationale |
|---|---|
| `food_nutrients.amount_per_100g` | All values normalized to 100g; any new nutrient (phe, leu) needs no schema change |
| `meal_items.computed_nutrients jsonb` | Snapshot at log time — editing a food never mutates history; clean ML features |
| `child_nutrient_targets` per-kg basis | Eliminates manual recalculation when child's weight changes |
| `tracker_events.data jsonb` | One table for all tracker types; extend with new types without migrations |
| Postgres RLS + helper functions | Security enforced at the DB layer — scales to hundreds of families safely |

### Lysine calculation

`src/domain/nutrition/calculations.ts` — pure TypeScript, framework-free:

```ts
// Core formula
const lysine_mg = (food.lysine_per_100g / 100) * amount_grams;

// Per-kg target resolution
const daily_limit = target.per_kg_amount * child.weight_kg;
```

Run the unit tests:
```bash
npm test
```

---

## Adding new metabolic diseases

1. Add nutrient to the `nutrients` table: `insert into nutrients values ('phenylalanine', 'Phenylalanine', 'mg', 13);`
2. Add `phenylalanine_mg_per_100g` column to your CSV and re-import
3. Set a target for the child in Children → [child] → targets (the target card supports any nutrient key)
4. The analytics view picks it up automatically

---

## Future roadmap (scaffolded, not built)

- Email delivery for circle invites
- Full diaper/medicine/activity detail screens
- Photo sharing feed
- Push notification reminders
- Warehouse export (`daily_nutrient_intake` view → dbt → BigQuery/Snowflake)
- ML intake prediction models (seam: the `computed_nutrients` snapshot provides stable feature vectors)
