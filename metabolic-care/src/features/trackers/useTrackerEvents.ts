import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { TrackerEvent, Json } from '../../lib/database.types';

export function useTrackerEvents(
  childId: string | undefined,
  type?: string,
  limit: number = 20,
) {
  return useQuery({
    queryKey: ['tracker-events', childId, type],
    enabled: !!childId,
    queryFn: async () => {
      let query = supabase
        .from('tracker_events')
        .select('*')
        .eq('child_id', childId!)
        .order('occurred_at', { ascending: false })
        .limit(limit);
      if (type) query = query.eq('type', type);
      const { data, error } = await query;
      if (error) throw error;
      return data as TrackerEvent[];
    },
  });
}

interface LogEventInput {
  child_id: string;
  type: string;
  logged_by: string;
  data?: Record<string, unknown>;
  note?: string | null;
  occurred_at?: string;
}

export function useLogTrackerEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, ...input }: LogEventInput) => {
      const { data: event, error } = await supabase
        .from('tracker_events')
        .insert({
          ...input,
          data: (data ?? {}) as unknown as Json,
          occurred_at: input.occurred_at ?? new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return event as TrackerEvent;
    },
    onSuccess: (event) => {
      qc.invalidateQueries({ queryKey: ['tracker-events', event.child_id] });
    },
  });
}
