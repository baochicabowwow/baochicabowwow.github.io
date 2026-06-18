import type { ComputedNutrients, Food, NutrientTarget, Child } from './types';

// Maps nutrient key → result key suffix so totals carry meaningful units
const UNIT_SUFFIX: Record<string, string> = {
  lysine: '_mg',
  protein: '_g',
  energy: '_kcal',
  arginine: '_mg',
  threonine: '_mg',
  tryptophan: '_mg',
  phenylalanine: '_mg',
  leucine: '_mg',
  isoleucine: '_mg',
  valine: '_mg',
};

export function nutrientResultKey(nutrientKey: string): string {
  return `${nutrientKey}${UNIT_SUFFIX[nutrientKey] ?? '_amt'}`;
}

/**
 * Compute nutrient amounts for one food item at a given weight.
 * All food_nutrients are stored per 100g; this scales them.
 * Returns a snapshot object suitable for storing in computed_nutrients.
 */
export function calculateItemNutrients(food: Food, amountGrams: number): ComputedNutrients {
  if (amountGrams <= 0) return {};
  const ratio = amountGrams / 100;
  const result: ComputedNutrients = {};
  for (const fn of food.food_nutrients) {
    result[nutrientResultKey(fn.nutrient_key)] = fn.amount_per_100g * ratio;
  }
  return result;
}

/**
 * Resolve the effective daily limit for a child.
 * basis='per_kg': multiplies per_kg_amount by child's current weight.
 * basis='absolute': returns daily_limit_amount directly.
 * Returns null when data is insufficient to compute.
 */
export function effectiveDailyTarget(target: NutrientTarget, child: Child): number | null {
  if (target.basis === 'per_kg') {
    if (!target.per_kg_amount || !child.weight_kg) return null;
    return target.per_kg_amount * child.weight_kg;
  }
  return target.daily_limit_amount ?? null;
}

/** Sum nutrient values across multiple logged items. */
export function sumNutrients(itemNutrients: ComputedNutrients[]): ComputedNutrients {
  const result: ComputedNutrients = {};
  for (const item of itemNutrients) {
    for (const [key, value] of Object.entries(item)) {
      result[key] = (result[key] ?? 0) + value;
    }
  }
  return result;
}

/** How much of the daily allowance is left (never negative). */
export function remainingAllowance(totalConsumed: number, effectiveLimit: number): number {
  return Math.max(0, effectiveLimit - totalConsumed);
}

/** Percentage of daily limit consumed, capped at 100. */
export function percentOfLimit(totalConsumed: number, effectiveLimit: number): number {
  if (effectiveLimit <= 0) return 0;
  return Math.min(100, (totalConsumed / effectiveLimit) * 100);
}

/** Convert a named serving to grams. */
export function gramsFromServing(servingGrams: number, quantity: number): number {
  return servingGrams * quantity;
}
