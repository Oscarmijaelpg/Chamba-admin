import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Embudo de activación (usuarios únicos por etapa), agregado en Postgres vía
// RPC admin_funnel. El % es relativo al total de registrados.
export function useFunnel() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'funnel'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_funnel');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const total = data?.total ?? 0;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  const stages = data
    ? [
        { stage: 'Registrados', value: total, pct: 100 },
        { stage: 'Activos (30d)', value: data.active ?? 0, pct: pct(data.active ?? 0) },
        { stage: 'Postularon', value: data.applied ?? 0, pct: pct(data.applied ?? 0) },
        { stage: 'Con pago', value: data.paid ?? 0, pct: pct(data.paid ?? 0) },
      ]
    : [];

  return { stages, loading: isLoading };
}
