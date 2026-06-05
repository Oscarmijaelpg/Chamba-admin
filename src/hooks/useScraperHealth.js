import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Salud del scraper de empleos externos (tabla `scraper_runs`) + total de
// ofertas externas activas en la tabla `jobs` (is_external=true, status='open').
// Métrica puramente operativa que vive sólo en Supabase — PostHog no la cubre.
const DAY_MS = 24 * 60 * 60 * 1000;

export function useScraperHealth() {
  const [runs, setRuns] = useState([]);
  const [bySource, setBySource] = useState([]);
  const [insertedTrend, setInsertedTrend] = useState([]);
  const [stats, setStats] = useState({ successRate: 0, totalRuns: 0, activeJobs: 0, lastRunAt: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      const since = new Date(Date.now() - 30 * DAY_MS).toISOString();

      const [{ data: runRows }, { count: activeJobs }] = await Promise.all([
        supabase
          .from('scraper_runs')
          .select('source, started_at, finished_at, status, jobs_found, jobs_inserted, jobs_updated')
          .gte('started_at', since)
          .order('started_at', { ascending: false }),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_external', true).eq('status', 'open'),
      ]);

      if (cancelled) return;

      const rows = runRows ?? [];
      const totalRuns = rows.length;
      const successful = rows.filter((r) => r.status === 'success').length;
      const successRate = totalRuns ? Math.round((successful / totalRuns) * 100) : 0;

      // Última corrida por fuente (rows ya vienen ordenadas desc por started_at).
      const latestBySource = {};
      rows.forEach((r) => {
        if (r.source && !latestBySource[r.source]) latestBySource[r.source] = r;
      });

      // Empleos insertados por día.
      const trend = {};
      rows.forEach((r) => {
        const key = (r.started_at ?? '').slice(0, 10);
        if (!key) return;
        trend[key] = (trend[key] ?? 0) + (r.jobs_inserted ?? 0);
      });
      const insertedTrendArr = Object.entries(trend)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, inserted]) => ({ date: date.slice(5), inserted }));

      setRuns(rows.slice(0, 12));
      setBySource(Object.values(latestBySource));
      setInsertedTrend(insertedTrendArr);
      setStats({
        successRate,
        totalRuns,
        activeJobs: activeJobs ?? 0,
        lastRunAt: rows[0]?.started_at ?? null,
      });
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  return { runs, bySource, insertedTrend, stats, loading };
}
