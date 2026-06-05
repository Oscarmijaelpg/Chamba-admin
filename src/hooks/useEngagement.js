import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Recurrencia aproximada calculada en el servidor (Supabase) a partir de
// `analytics_events`. Complementa a PostHog dentro del propio admin:
//   - DAU  = usuarios únicos activos en las últimas 24 h
//   - WAU  = usuarios únicos activos en los últimos 7 días
//   - MAU  = usuarios únicos activos en los últimos 30 días
//   - Stickiness = DAU / MAU (qué % del mes vuelve a diario)
const DAY_MS = 24 * 60 * 60 * 1000;

export function useEngagement() {
  const [metrics, setMetrics] = useState({ dau: 0, wau: 0, mau: 0, stickiness: 0 });
  const [dauTrend, setDauTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      const now = Date.now();
      const monthAgo = new Date(now - 30 * DAY_MS).toISOString();

      const { data: rows, error } = await supabase
        .from('analytics_events')
        .select('user_id, created_at')
        .gte('created_at', monthAgo);

      if (cancelled) return;
      if (error) { setLoading(false); return; }

      const dauSet = new Set();
      const wauSet = new Set();
      const mauSet = new Set();
      const perDay = {}; // 'YYYY-MM-DD' -> Set de user_id

      (rows ?? []).forEach((r) => {
        if (!r.user_id || !r.created_at) return;
        const age = now - new Date(r.created_at).getTime();
        if (age <= DAY_MS) dauSet.add(r.user_id);
        if (age <= 7 * DAY_MS) wauSet.add(r.user_id);
        mauSet.add(r.user_id);

        const key = r.created_at.slice(0, 10);
        if (!perDay[key]) perDay[key] = new Set();
        perDay[key].add(r.user_id);
      });

      const trend = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now - i * DAY_MS);
        const key = d.toISOString().slice(0, 10);
        trend.push({
          date: d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }),
          activos: perDay[key] ? perDay[key].size : 0,
        });
      }

      const mau = mauSet.size;
      const dau = dauSet.size;

      setMetrics({
        dau,
        wau: wauSet.size,
        mau,
        stickiness: mau ? Math.round((dau / mau) * 100) : 0,
      });
      setDauTrend(trend);
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  return { metrics, dauTrend, loading };
}
