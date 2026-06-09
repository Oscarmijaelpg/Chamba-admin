import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { dayLabel } from '../lib/dates';

// Vistas de empleos por día (event_name='view_job') en 30 días, vía RPC admin_event_trend.
export function useJobViewsTrend() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'event_trend', 'view_job', 30],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_event_trend', { p_event: 'view_job', p_days: 30 });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const series = (data?.series ?? []).map((s) => ({ date: dayLabel(s.d), vistas: s.count }));
  return { data: series, total: data?.total ?? 0, loading: isLoading };
}
