import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { TrackerEvent } from '../../lib/database.types';
import type { MealWithItems } from '../diet/useMeals';

export type TimelineEventType = 'meal' | 'medicine' | 'diaper' | 'activity' | 'tracker';

export interface TimelineEntry {
  id: string;
  type: TimelineEventType;
  occurred_at: string;
  label: string;
  detail: string;
  raw: MealWithItems | TrackerEvent;
}

function mealToEntry(meal: MealWithItems): TimelineEntry {
  const mealType = meal.meal_type ?? 'Meal';
  const itemCount = meal.meal_items.length;
  // Sum the first nutrient key present across items
  const nutrients = meal.meal_items.reduce(
    (acc, mi) => {
      const cn = mi.computed_nutrients as Record<string, number>;
      for (const [k, v] of Object.entries(cn)) {
        acc[k] = (acc[k] ?? 0) + v;
      }
      return acc;
    },
    {} as Record<string, number>,
  );
  const lysine = nutrients['lysine_mg'];
  const detail = [
    `${itemCount} item${itemCount !== 1 ? 's' : ''}`,
    lysine != null ? `${Math.round(lysine)} mg lysine` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    id: meal.id,
    type: 'meal',
    occurred_at: meal.logged_at,
    label: mealType.charAt(0).toUpperCase() + mealType.slice(1),
    detail,
    raw: meal,
  };
}

function trackerToEntry(event: TrackerEvent): TimelineEntry {
  const data = event.data as Record<string, unknown>;
  let label = event.type.charAt(0).toUpperCase() + event.type.slice(1);
  let detail = '';

  if (event.type === 'medicine') {
    const name = data['name'] as string | undefined;
    const dose = data['dose'] as string | undefined;
    const unit = data['unit'] as string | undefined;
    label = name ?? 'Medicine';
    detail = dose && unit ? `${dose} ${unit}` : '';
  } else if (event.type === 'diaper') {
    label = 'Diaper';
    detail = data['wet'] ? 'Wet' : data['soiled'] ? 'Soiled' : '';
  } else if (event.type === 'activity') {
    label = 'Activity';
    detail = (data['description'] as string) ?? '';
  }

  return {
    id: event.id,
    type: event.type as TimelineEventType,
    occurred_at: event.occurred_at,
    label,
    detail,
    raw: event,
  };
}

export interface DayGroup {
  date: string; // YYYY-MM-DD
  entries: TimelineEntry[];
  mealCount: number;
  medicineCount: number;
  diaperCount: number;
}

export function useTimeline(childId: string | undefined, days: number = 7) {
  return useQuery({
    queryKey: ['timeline', childId, days],
    enabled: !!childId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days + 1);
      const sinceStr = since.toISOString().slice(0, 10);

      const [mealsRes, eventsRes] = await Promise.all([
        supabase
          .from('meals')
          .select('*, meal_items(*, food:foods(*, food_nutrients(*)))')
          .eq('child_id', childId!)
          .gte('logged_at', `${sinceStr}T00:00:00`)
          .order('logged_at', { ascending: false }),
        supabase
          .from('tracker_events')
          .select('*')
          .eq('child_id', childId!)
          .gte('occurred_at', `${sinceStr}T00:00:00`)
          .order('occurred_at', { ascending: false }),
      ]);

      if (mealsRes.error) throw mealsRes.error;
      if (eventsRes.error) throw eventsRes.error;

      const entries: TimelineEntry[] = [
        ...(mealsRes.data as unknown as MealWithItems[]).map(mealToEntry),
        ...(eventsRes.data as TrackerEvent[]).map(trackerToEntry),
      ].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

      // Group by day
      const grouped: Record<string, DayGroup> = {};
      for (const entry of entries) {
        const date = entry.occurred_at.slice(0, 10);
        if (!grouped[date]) {
          grouped[date] = { date, entries: [], mealCount: 0, medicineCount: 0, diaperCount: 0 };
        }
        grouped[date].entries.push(entry);
        if (entry.type === 'meal') grouped[date].mealCount++;
        if (entry.type === 'medicine') grouped[date].medicineCount++;
        if (entry.type === 'diaper') grouped[date].diaperCount++;
      }

      return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
    },
  });
}
