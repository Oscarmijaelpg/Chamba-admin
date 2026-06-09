import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Salud del scraper de empleos externos (scraper_runs) + ofertas externas activas.
// Datos pequeños (corridas de 30d); se agregan en cliente pero se cachean con RQ.
const DAY_MS = 24 * 60 * 60 * 1000;

const EMPTY = { runs: [], bySource: [], insertedTrend: [], stats: { successRate: 0, totalRuns: 0, activeJobs: 0, lastRunAt: null } };

export function useScraperHealth() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'scraper_health'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * DAY_MS).toISOString();

      const [{ data: runRows }, { count: activeJobs }] = await Promise.all([
        supabase
          .from('scraper_runs')
          .select('source, started_at, finished_at, status, jobs_found, jobs_inserted, jobs_updated')
          .gte('started_at', since)
          .order('started_at', { ascending: false }),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_external', true).eq('status', 'open'),
      ]);

      const rows = runRows ?? [];
      const totalRuns = rows.length;
      const successful = rows.filter((r) => r.status === 'success').length;
      const successRate = totalRuns ? Math.round((successful / totalRuns) * 100) : 0;

      const latestBySource = {};
      rows.forEach((r) => {
        if (r.source && !latestBySource[r.source]) latestBySource[r.source] = r;
      });

      const trend = {};
      rows.forEach((r) => {
        const key = (r.started_at ?? '').slice(0, 10);
        if (!key) return;
        trend[key] = (trend[key] ?? 0) + (r.jobs_inserted ?? 0);
      });
      const insertedTrend = Object.entries(trend)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, inserted]) => ({ date: date.slice(5), inserted }));

      return {
        runs: rows.slice(0, 12),
        bySource: Object.values(latestBySource),
        insertedTrend,
        stats: {
          successRate,
          totalRuns,
          activeJobs: activeJobs ?? 0,
          lastRunAt: rows[0]?.started_at ?? null,
        },
      };
    },
  });

  return { ...(data ?? EMPTY), loading: isLoading };
}
