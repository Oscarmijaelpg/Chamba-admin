import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Postulaciones por día (últimos 30 días) a partir de la tabla `applications`.
function buildDaySeries(days) {
  const series = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    series[key] = {
      date: d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }),
      postulaciones: 0,
    };
  }
  return series;
}

export function useApplicationsTrend() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 30);
      since.setHours(0, 0, 0, 0);

      const { data: rows, error } = await supabase
        .from('applications')
        .select('created_at')
        .gte('created_at', since.toISOString());

      if (cancelled) return;
      if (error) { setLoading(false); return; }

      const series = buildDaySeries(30);
      (rows ?? []).forEach((r) => {
        const key = (r.created_at ?? '').slice(0, 10);
        if (series[key]) series[key].postulaciones += 1;
      });

      setData(Object.values(series));
      setTotal(rows?.length ?? 0);
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  return { data, total, loading };
}
