import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { ChildNutrientTarget } from '../../lib/database.types';

export function useNutrientTargets(childId: string | undefined) {
  return useQuery({
    queryKey: ['nutrient-targets', childId],
    enabled: !!childId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('child_nutrient_targets')
        .select('*')
        .eq('child_id', childId!)
        .lte('effective_from', today)
        .or(`effective_to.is.null,effective_to.gte.${today}`)
        .order('nutrient_key')
        .order('effective_from', { ascending: false });
      if (error) throw error;
      // Return the latest effective target per nutrient
      const seen = new Set<string>();
      return (data as ChildNutrientTarget[]).filter((t) => {
        if (seen.has(t.nutrient_key)) return false;
        seen.add(t.nutrient_key);
        return true;
      });
    },
  });
}

interface UpsertTargetInput {
  child_id: string;
  nutrient_key: string;
  basis: 'absolute' | 'per_kg';
  daily_limit_amount?: number | null;
  per_kg_amount?: number | null;
  set_by: string;
  note?: string | null;
}

export function useUpsertNutrientTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertTargetInput) => {
      // Close the current active target for this nutrient (if any)
      const today = new Date().toISOString().slice(0, 10);
      await supabase
        .from('child_nutrient_targets')
        .update({ effective_to: today })
        .eq('child_id', input.child_id)
        .eq('nutrient_key', input.nutrient_key)
        .is('effective_to', null);

      // Insert new target
      const { data, error } = await supabase
        .from('child_nutrient_targets')
        .insert({ ...input, effective_from: today })
        .select()
        .single();
      if (error) throw error;
      return data as ChildNutrientTarget;
    },
    onSuccess: (target) => {
      qc.invalidateQueries({ queryKey: ['nutrient-targets', target.child_id] });
    },
  });
}
