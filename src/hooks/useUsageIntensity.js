import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Intensidad de uso (30d): cuánto consume cada usuario activo (RPC admin_usage_intensity).
export function useUsageIntensity() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'usage_intensity'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_usage_intensity');
      if (error) throw error;
      return data;
    },
  });

  return {
    views30: data?.views30 ?? 0,
    searches30: data?.searches30 ?? 0,
    mau: data?.mau ?? 0,
    viewsPerActiveUser: data?.viewsPerActiveUser ?? 0,
    searchesPerActiveUser: data?.searchesPerActiveUser ?? 0,
    viewsPerActiveUserPerDay: data?.viewsPerActiveUserPerDay ?? 0,
    loading: isLoading,
  };
}
