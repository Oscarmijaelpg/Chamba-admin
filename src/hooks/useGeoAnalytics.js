import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Geografía: usuarios por ciudad (+ % y edad promedio) y empleos abiertos por
// ciudad (RPC admin_geo_analytics). Además arma `compare`: oferta vs demanda por
// ciudad, que es donde se ve la descompensación (ej. La Paz: muchos usuarios,
// pocos empleos; Santa Cruz: al revés).
export function useGeoAnalytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'geo'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_geo_analytics');
      if (error) throw error;
      return data;
    },
  });

  const byCity = data?.byCity ?? [];
  const jobsByCity = data?.jobsByCity ?? [];

  const usersMap = Object.fromEntries(byCity.map((c) => [c.city, c.users]));
  const jobsMap = Object.fromEntries(jobsByCity.map((j) => [j.city, j.jobs]));
  const cities = Array.from(new Set([...byCity.map((c) => c.city), ...jobsByCity.map((j) => j.city)]));

  const compare = cities
    .filter((c) => c !== 'Sin ciudad')
    .map((city) => ({ city, usuarios: usersMap[city] ?? 0, empleos: jobsMap[city] ?? 0 }))
    .sort((a, b) => b.usuarios + b.empleos - (a.usuarios + a.empleos));

  // Ciudad con mayor brecha demanda>oferta (≥20 usuarios para evitar ruido).
  const gap = compare
    .filter((c) => c.usuarios >= 20)
    .map((c) => ({ ...c, deficit: c.usuarios - c.empleos }))
    .sort((a, b) => b.deficit - a.deficit)[0];

  return { byCity, jobsByCity, compare, gap, totalUsers: data?.totalUsers ?? 0, loading: isLoading };
}
