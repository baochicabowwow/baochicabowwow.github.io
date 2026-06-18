import {
  calculateItemNutrients,
  effectiveDailyTarget,
  sumNutrients,
  remainingAllowance,
  percentOfLimit,
  gramsFromServing,
} from './calculations';
import type { Food, NutrientTarget, Child } from './types';

const chickenBreast: Food = {
  id: 'f1',
  name: 'Chicken breast, cooked',
  default_serving_g: 85,
  food_nutrients: [
    { nutrient_key: 'lysine', amount_per_100g: 2800 },
    { nutrient_key: 'protein', amount_per_100g: 31 },
    { nutrient_key: 'energy', amount_per_100g: 165 },
  ],
};

const apple: Food = {
  id: 'f2',
  name: 'Apple',
  default_serving_g: 182,
  food_nutrients: [
    { nutrient_key: 'lysine', amount_per_100g: 16 },
    { nutrient_key: 'protein', amount_per_100g: 0.3 },
    { nutrient_key: 'energy', amount_per_100g: 52 },
  ],
};

const child: Child = { id: 'c1', name: 'Elara', weight_kg: 8.5 };

describe('calculateItemNutrients', () => {
  it('calculates lysine for 85g chicken breast', () => {
    const result = calculateItemNutrients(chickenBreast, 85);
    // 2800 mg/100g * 0.85 = 2380 mg
    expect(result.lysine_mg).toBeCloseTo(2380, 0);
    expect(result.protein_g).toBeCloseTo(26.35, 1);
    expect(result.energy_kcal).toBeCloseTo(140.25, 1);
  });

  it('calculates correctly for the reference 100g amount', () => {
    const result = calculateItemNutrients(chickenBreast, 100);
    expect(result.lysine_mg).toBeCloseTo(2800, 0);
    expect(result.protein_g).toBeCloseTo(31, 1);
  });

  it('calculates for a small portion (10g apple)', () => {
    const result = calculateItemNutrients(apple, 10);
    // 16 mg/100g * 0.1 = 1.6 mg
    expect(result.lysine_mg).toBeCloseTo(1.6, 1);
  });

  it('returns empty object for 0 grams', () => {
    const result = calculateItemNutrients(chickenBreast, 0);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('returns empty object for negative grams', () => {
    const result = calculateItemNutrients(chickenBreast, -50);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('handles food with no nutrients gracefully', () => {
    const water: Food = { id: 'f3', name: 'Water', default_serving_g: 240, food_nutrients: [] };
    expect(calculateItemNutrients(water, 240)).toEqual({});
  });

  it('uses _amt suffix for unknown nutrient keys', () => {
    const food: Food = {
      id: 'f4',
      name: 'Special formula',
      default_serving_g: 100,
      food_nutrients: [{ nutrient_key: 'custom_nutrient', amount_per_100g: 50 }],
    };
    const result = calculateItemNutrients(food, 100);
    expect(result['custom_nutrient_amt']).toBeCloseTo(50, 1);
  });
});

describe('effectiveDailyTarget', () => {
  it('returns absolute daily_limit_amount directly', () => {
    const target: NutrientTarget = {
      nutrient_key: 'lysine',
      basis: 'absolute',
      daily_limit_amount: 800,
    };
    expect(effectiveDailyTarget(target, child)).toBe(800);
  });

  it('multiplies per_kg_amount by child weight', () => {
    const target: NutrientTarget = {
      nutrient_key: 'lysine',
      basis: 'per_kg',
      per_kg_amount: 100,
    };
    // 100 mg/kg * 8.5 kg = 850 mg/day
    expect(effectiveDailyTarget(target, child)).toBeCloseTo(850, 0);
  });

  it('returns null when per_kg but child has no weight', () => {
    const target: NutrientTarget = {
      nutrient_key: 'lysine',
      basis: 'per_kg',
      per_kg_amount: 100,
    };
    const noWeight: Child = { id: 'c2', name: 'Baby', weight_kg: null };
    expect(effectiveDailyTarget(target, noWeight)).toBeNull();
  });

  it('returns null when absolute but no daily_limit_amount', () => {
    const target: NutrientTarget = {
      nutrient_key: 'lysine',
      basis: 'absolute',
      daily_limit_amount: null,
    };
    expect(effectiveDailyTarget(target, child)).toBeNull();
  });

  it('returns null when per_kg but per_kg_amount is null', () => {
    const target: NutrientTarget = {
      nutrient_key: 'lysine',
      basis: 'per_kg',
      per_kg_amount: null,
    };
    expect(effectiveDailyTarget(target, child)).toBeNull();
  });
});

describe('sumNutrients', () => {
  it('sums nutrients across multiple meal items', () => {
    const items = [
      { lysine_mg: 100, protein_g: 5 },
      { lysine_mg: 200, protein_g: 10 },
      { lysine_mg: 50, protein_g: 2.5 },
    ];
    const sum = sumNutrients(items);
    expect(sum.lysine_mg).toBeCloseTo(350, 0);
    expect(sum.protein_g).toBeCloseTo(17.5, 1);
  });

  it('returns empty object for zero items', () => {
    expect(sumNutrients([])).toEqual({});
  });

  it('handles items with different/disjoint nutrient keys', () => {
    const items = [{ lysine_mg: 100 }, { protein_g: 5 }];
    const sum = sumNutrients(items);
    expect(sum.lysine_mg).toBe(100);
    expect(sum.protein_g).toBe(5);
  });
});

describe('remainingAllowance', () => {
  it('calculates remaining when under limit', () => {
    expect(remainingAllowance(300, 800)).toBe(500);
  });

  it('returns 0 when exactly at limit', () => {
    expect(remainingAllowance(800, 800)).toBe(0);
  });

  it('returns 0 when over limit (never negative)', () => {
    expect(remainingAllowance(900, 800)).toBe(0);
  });
});

describe('percentOfLimit', () => {
  it('calculates percentage', () => {
    expect(percentOfLimit(400, 800)).toBe(50);
  });

  it('caps at 100% when over limit', () => {
    expect(percentOfLimit(1000, 800)).toBe(100);
  });

  it('returns 0 for a zero limit', () => {
    expect(percentOfLimit(100, 0)).toBe(0);
  });

  it('returns 0 when nothing consumed', () => {
    expect(percentOfLimit(0, 800)).toBe(0);
  });
});

describe('gramsFromServing', () => {
  it('converts a serving quantity to grams', () => {
    expect(gramsFromServing(85, 2)).toBe(170);
    expect(gramsFromServing(240, 0.5)).toBe(120);
  });
});
