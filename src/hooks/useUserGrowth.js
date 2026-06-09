import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const PERIODS = {
  '7d':  { days: 7,  label: 'Última semana',    fmt: (d) => d.toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' }) },
  '30d': { days: 30, label: 'Último mes',        fmt: (d) => d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }) },
  '90d': { days: 90, label: 'Últimos 3 meses',   fmt: (d) => d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }) },
};

// Crecimiento de usuarios: nuevos por día (RPC admin_user_growth) + acumulado en JS.
export function useUserGrowth() {
  const [period, setPeriod] = useState('30d');
  const { days, fmt } = PERIODS[period];

  const { data: rpc, isLoading } = useQuery({
    queryKey: ['analytics', 'user_growth', period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_user_growth', { p_days: days });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  let acc = 0;
  const data = (rpc?.series ?? []).map((s) => {
    acc += s.nuevos;
    return { date: fmt(new Date(`${s.d}T00:00:00`)), nuevos: s.nuevos, acumulado: acc };
  });

  return { data, loading: isLoading, period, setPeriod, periods: PERIODS, totalPeriod: rpc?.total ?? 0 };
}
