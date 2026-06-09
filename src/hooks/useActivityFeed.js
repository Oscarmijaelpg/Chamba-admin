import { supabase } from '../lib/supabase';
import { usePagedQuery } from './usePagedQuery';

// Feed completo de actividad de la plataforma, paginado (RPC admin_activity_feed):
// la versión "ver todo" de "Actividad Reciente" del dashboard.
export function useActivityFeed() {
  return usePagedQuery({
    key: ['activity_feed'],
    pageSize: 25,
    deps: [],
    queryFn: async ({ from, to }) => {
      const { data, error } = await supabase.rpc('admin_activity_feed', {
        p_limit: to - from + 1,
        p_offset: from,
      });
      if (error) throw error;
      return { rows: data?.items ?? [], total: data?.total ?? 0 };
    },
  });
}
