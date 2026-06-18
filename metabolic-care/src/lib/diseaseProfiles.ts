export interface NutrientProfile {
  nutrient_key: string;
  display_name: string;
  unit: string;
  limit_type: 'upper' | 'lower';
  default_basis: 'per_kg' | 'absolute';
  typical_per_kg?: number;
  description: string;
}

export interface DiseaseProfile {
  display_name: string;
  aliases: string[];
  nutrients: NutrientProfile[];
}

export const DISEASE_PROFILES: DiseaseProfile[] = [
  {
    display_name: 'Pyridoxine-Dependent Epilepsy (PDE / ALDH7A1)',
    aliases: ['pde', 'pyridoxine-dependent', 'pyridoxine dependent', 'aldh7a1'],
    nutrients: [
      {
        nutrient_key: 'lysine',
        display_name: 'Lysine',
        unit: 'mg',
        limit_type: 'upper',
        default_basis: 'per_kg',
        typical_per_kg: 100,
        description: 'Lysine restriction reduces toxic metabolite accumulation in the brain',
      },
    ],
  },
  {
    display_name: 'Phenylketonuria (PKU)',
    aliases: ['pku', 'phenylketonuria'],
    nutrients: [
      {
        nutrient_key: 'phenylalanine',
        display_name: 'Phenylalanine',
        unit: 'mg',
        limit_type: 'upper',
        default_basis: 'per_kg',
        typical_per_kg: 10,
        description: 'Phenylalanine restriction prevents neurological damage',
      },
    ],
  },
  {
    display_name: 'MSUD (Maple Syrup Urine Disease)',
    aliases: ['msud', 'maple syrup urine', 'maple syrup'],
    nutrients: [
      {
        nutrient_key: 'leucine',
        display_name: 'Leucine',
        unit: 'mg',
        limit_type: 'upper',
        default_basis: 'per_kg',
        typical_per_kg: 150,
        description: 'Branched-chain amino acid restriction',
      },
      {
        nutrient_key: 'isoleucine',
        display_name: 'Isoleucine',
        unit: 'mg',
        limit_type: 'upper',
        default_basis: 'per_kg',
        typical_per_kg: 80,
        description: 'Branched-chain amino acid restriction',
      },
      {
        nutrient_key: 'valine',
        display_name: 'Valine',
        unit: 'mg',
        limit_type: 'upper',
        default_basis: 'per_kg',
        typical_per_kg: 120,
        description: 'Branched-chain amino acid restriction',
      },
    ],
  },
  {
    display_name: 'Homocystinuria (HCU)',
    aliases: ['hcu', 'homocystinuria'],
    nutrients: [
      {
        nutrient_key: 'methionine',
        display_name: 'Methionine',
        unit: 'mg',
        limit_type: 'upper',
        default_basis: 'per_kg',
        typical_per_kg: 25,
        description: 'Methionine restriction prevents vascular and skeletal complications',
      },
    ],
  },
  {
    display_name: 'Glutaric Aciduria Type 1 (GA1)',
    aliases: ['ga1', 'glutaric aciduria', 'glutaric acidemia'],
    nutrients: [
      {
        nutrient_key: 'lysine',
        display_name: 'Lysine',
        unit: 'mg',
        limit_type: 'upper',
        default_basis: 'per_kg',
        typical_per_kg: 100,
        description: 'Lysine restriction reduces glutaric acid production',
      },
      {
        nutrient_key: 'tryptophan',
        display_name: 'Tryptophan',
        unit: 'mg',
        limit_type: 'upper',
        default_basis: 'per_kg',
        typical_per_kg: 20,
        description: 'Tryptophan is a minor precursor to glutaric acid',
      },
    ],
  },
  {
    display_name: 'Isovaleric Acidemia (IVA)',
    aliases: ['iva', 'isovaleric acidemia', 'isovaleric aciduria'],
    nutrients: [
      {
        nutrient_key: 'leucine',
        display_name: 'Leucine',
        unit: 'mg',
        limit_type: 'upper',
        default_basis: 'per_kg',
        typical_per_kg: 120,
        description: 'Leucine restriction reduces isovaleric acid accumulation',
      },
    ],
  },
];

export function getProfilesForConditions(conditions: string[]): DiseaseProfile[] {
  const lower = conditions.map((c) => c.toLowerCase());
  return DISEASE_PROFILES.filter((p) =>
    p.aliases.some((alias) => lower.some((c) => c.includes(alias)))
  );
}

export function getNutrientDisplayName(nutrientKey: string): string {
  for (const profile of DISEASE_PROFILES) {
    const found = profile.nutrients.find((n) => n.nutrient_key === nutrientKey);
    if (found) return found.display_name;
  }
  return nutrientKey.charAt(0).toUpperCase() + nutrientKey.slice(1);
}

export function getNutrientUnit(nutrientKey: string): string {
  for (const profile of DISEASE_PROFILES) {
    const found = profile.nutrients.find((n) => n.nutrient_key === nutrientKey);
    if (found) return found.unit;
  }
  return 'mg';
}
