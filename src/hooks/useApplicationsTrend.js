import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { dayLabel } from '../lib/dates';

// Postulaciones por día (30d), agregado en Postgres vía RPC admin_applications_trend.
export function useApplicationsTrend() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'applications_trend', 30],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_applications_trend', { p_days: 30 });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const series = (data?.series ?? []).map((s) => ({
    date: dayLabel(s.d),
    postulaciones: s.postulaciones,
  }));

  return { data: series, total: data?.total ?? 0, loading: isLoading };
}
