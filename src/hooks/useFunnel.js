import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Embudo de activación del trabajador, calculado con datos reales de negocio
// (no depende de eventos, así funciona desde el día 1):
//   Registrados → Activos (30d) → Postularon → Con pago liberado
// Cada etapa cuenta usuarios ÚNICOS, y el % es relativo al total de registrados.
const DAY_MS = 24 * 60 * 60 * 1000;

export function useFunnel() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      const monthAgo = new Date(Date.now() - 30 * DAY_MS).toISOString();

      const [
        { count: totalUsers },
        { data: appsRows },
        { data: payRows },
        { data: activeRows },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('worker_id'),
        supabase.from('payments').select('worker_id, status'),
        supabase.from('analytics_events').select('user_id').gte('created_at', monthAgo),
      ]);

      if (cancelled) return;

      const applied = new Set((appsRows ?? []).map((r) => r.worker_id).filter(Boolean)).size;
      const paid = new Set(
        (payRows ?? []).filter((r) => r.status === 'released').map((r) => r.worker_id).filter(Boolean),
      ).size;
      const active = new Set((activeRows ?? []).map((r) => r.user_id).filter(Boolean)).size;

      const total = totalUsers ?? 0;
      const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

      setStages([
        { stage: 'Registrados', value: total, pct: 100 },
        { stage: 'Activos (30d)', value: active, pct: pct(active) },
        { stage: 'Postularon', value: applied, pct: pct(applied) },
        { stage: 'Con pago', value: paid, pct: pct(paid) },
      ]);
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  return { stages, loading };
}
