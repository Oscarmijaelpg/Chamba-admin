import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const RANGES = ['< 18', '18-24', '25-34', '35-44', '45+'];

const EMPTY = {
  total: 0,
  withAge: 0,
  avg: null,
  median: null,
  min: null,
  max: null,
  coverage: 0,
  distribution: RANGES.map((r) => ({ rango: r, usuarios: 0 })),
};

// Distribución etaria de usuarios, agregada en Postgres vía RPC admin_age_analytics.
export function useAgeAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'age'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_age_analytics');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  return { ...(data ?? EMPTY), loading: isLoading };
}
