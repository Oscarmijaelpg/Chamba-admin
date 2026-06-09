import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { dayLabel } from '../lib/dates';

// Búsqueda e intención (search_performed): volumen, pestaña, longitud promedio y
// serie diaria (RPC admin_search_insights). `viewsPerSearch` = vistas/búsquedas,
// proxy de cuántos empleos abre la gente por cada búsqueda.
export function useSearchInsights(days = 30) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'search_insights', days],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_search_insights', { p_days: days });
      if (error) throw error;
      return data;
    },
  });

  const total = data?.total ?? 0;
  const views = data?.views ?? 0;
  const perDay = (data?.perDay ?? []).map((p) => ({ date: dayLabel(p.d), busquedas: p.n }));

  return {
    total,
    views,
    avgLen: data?.avgLen ?? 0,
    byTab: data?.byTab ?? [],
    perDay,
    viewsPerSearch: total > 0 ? Math.round((views / total) * 10) / 10 : 0,
    loading: isLoading,
  };
}
