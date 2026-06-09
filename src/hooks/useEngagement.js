import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { dayLabel } from '../lib/dates';

// DAU/WAU/MAU + stickiness y serie diaria de activos (30d).
// Agregado en Postgres vía RPC admin_engagement_metrics (antes se bajaban miles
// de filas crudas de analytics_events y se contaban en el navegador).
export function useEngagement() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'engagement'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_engagement_metrics');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const metrics = {
    dau: data?.dau ?? 0,
    wau: data?.wau ?? 0,
    mau: data?.mau ?? 0,
    stickiness: data?.stickiness ?? 0,
  };
  const dauTrend = (data?.trend ?? []).map((t) => ({ date: dayLabel(t.d), activos: t.activos }));

  return { metrics, dauTrend, loading: isLoading };
}
