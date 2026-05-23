import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const PERIODS = {
  '7d':  { days: 7,  label: 'Última semana',    fmt: (d) => d.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' }) },
  '30d': { days: 30, label: 'Último mes',        fmt: (d) => d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }) },
  '90d': { days: 90, label: 'Últimos 3 meses',   fmt: (d) => d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }) },
};

function buildEmptySeries(days, fmt) {
  const series = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    series[key] = { date: fmt(d), nuevos: 0, total: 0, _key: key };
  }
  return series;
}

export function useUserGrowth() {
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPeriod, setTotalPeriod] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      const { days, fmt } = PERIODS[period];

      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);

      const { data: rows, error } = await supabase
        .from('users')
        .select('created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true });

      if (cancelled) return;
      if (error) { setLoading(false); return; }

      const series = buildEmptySeries(days, fmt);

      let running = 0;
      Object.values(series).forEach(slot => { slot._running = 0; });

      rows?.forEach(r => {
        const key = r.created_at.slice(0, 10);
        if (series[key]) series[key].nuevos += 1;
      });

      // acumulado
      let acc = 0;
      const result = Object.values(series).map(slot => {
        acc += slot.nuevos;
        return { date: slot.date, nuevos: slot.nuevos, acumulado: acc };
      });

      setTotalPeriod(rows?.length ?? 0);
      setData(result);
      setLoading(false);
    }

    fetch();
    return () => { cancelled = true; };
  }, [period]);

  return { data, loading, period, setPeriod, periods: PERIODS, totalPeriod };
}
