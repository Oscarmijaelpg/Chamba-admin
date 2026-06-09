import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { dayLabel } from '../lib/dates';

// Oferta de empleos (RPC admin_supply_analytics): inventario abierto por fuente y
// por categoría + oferta (nuevos) vs demanda (vistas) por día.
export function useSupplyAnalytics(days = 30) {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'supply', days],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_supply_analytics', { p_days: days });
      if (error) throw error;
      return data;
    },
  });

  const supplyDemand = (data?.supplyDemand ?? []).map((d) => ({
    date: dayLabel(d.d),
    nuevos: d.nuevos,
    vistas: d.vistas,
  }));

  return {
    bySource: data?.bySource ?? [],
    byCategory: data?.byCategory ?? [],
    supplyDemand,
    loading: isLoading,
  };
}
