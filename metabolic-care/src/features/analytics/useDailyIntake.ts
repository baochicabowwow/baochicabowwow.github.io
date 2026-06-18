import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { DailyNutrientIntake } from '../../lib/database.types';

export function useDailyIntake(
  childId: string | undefined,
  nutrientKey: string = 'lysine',
  days: number = 14,
) {
  return useQuery({
    queryKey: ['daily-intake', childId, nutrientKey, days],
    enabled: !!childId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days + 1);
      const sinceStr = since.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('daily_nutrient_intake')
        .select('*')
        .eq('child_id', childId!)
        .eq('nutrient_key', nutrientKey)
        .gte('log_date', sinceStr)
        .order('log_date');
      if (error) throw error;
      return data as DailyNutrientIntake[];
    },
  });
}

export function useTodayIntake(childId: string | undefined, nutrientKey: string = 'lysine') {
  const today = new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['daily-intake', childId, nutrientKey, 'today'],
    enabled: !!childId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_nutrient_intake')
        .select('*')
        .eq('child_id', childId!)
        .eq('nutrient_key', nutrientKey)
        .eq('log_date', today)
        .maybeSingle();
      if (error) throw error;
      return data as DailyNutrientIntake | null;
    },
  });
}
