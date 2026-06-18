export type NutrientKey = 'lysine' | 'protein' | 'energy' | 'arginine' | 'threonine' | 'tryptophan' | 'phenylalanine' | 'leucine' | 'isoleucine' | 'valine' | string;

export interface FoodNutrient {
  nutrient_key: NutrientKey;
  amount_per_100g: number;
}

export interface Food {
  id: string;
  name: string;
  brand?: string | null;
  default_serving_g: number;
  food_nutrients: FoodNutrient[];
}

// Keyed by e.g. "lysine_mg", "protein_g", "energy_kcal"
export type ComputedNutrients = Record<string, number>;

export interface NutrientTarget {
  nutrient_key: NutrientKey;
  basis: 'absolute' | 'per_kg';
  daily_limit_amount?: number | null;
  per_kg_amount?: number | null;
}

export interface Child {
  id: string;
  name: string;
  weight_kg?: number | null;
}

export interface DailyIntakeSummary {
  nutrient_key: NutrientKey;
  total_amount: number;
  effective_limit?: number | null;
  percent_of_limit?: number | null;
  within_limit?: boolean | null;
}
