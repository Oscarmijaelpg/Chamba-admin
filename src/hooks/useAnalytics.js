import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { dayLabel } from '../lib/dates';

// Eventos y tendencias (30d) para la sección "datos crudos".
// Agregado en Postgres vía RPC admin_event_stats; antes se bajaban hasta 1000
// eventos crudos (truncados) y se agrupaban en el navegador.
export function useAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'event_stats', 30],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_event_stats', { p_days: 30 });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const userTrend = (data?.userTrend ?? []).map((x) => ({ date: dayLabel(x.d), users: x.users }));
  const revenueTrend = (data?.revenueTrend ?? []).map((x) => ({ date: dayLabel(x.d), revenue: Number(x.revenue) }));
  const eventStats = data?.eventStats ?? [];

  return { userTrend, revenueTrend, eventStats, loading: isLoading };
}
