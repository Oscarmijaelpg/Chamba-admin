import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Qué tipo de empleos guarda más la gente como preferencia (onboarding / alertas).
// Agregado en Postgres vía RPC admin_preference_analytics: categorías ordenadas
// por nº de usuarios + % sobre el total de usuarios con preferencias.
export function usePreferenceAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'preferences'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_preference_analytics');
      if (error) throw error;
      return data;
    },
  });

  return {
    totalUsers: data?.totalUsers ?? 0,
    notifyUsers: data?.notifyUsers ?? 0,
    byCategory: data?.byCategory ?? [],
    loading: isLoading,
  };
}
