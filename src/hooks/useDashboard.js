import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { actionText, actionIcon } from '../lib/auditLabels';

const KEY = ['dashboard'];

function relTime(isoString) {
  const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  return mins < 60 ? `hace ${mins} min` : `hace ${Math.floor(mins / 60)}h`;
}

export function useDashboard(user) {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: KEY,
    enabled: !!user,
    queryFn: async () => {
      // Todo agregado en Postgres (RPC admin_dashboard_stats): sumas, conteos y
      // los feeds acotados (recargas pendientes + actividad reciente). Una sola
      // llamada, sin bajar filas para reducir en el navegador.
      const { data, error } = await supabase.rpc('admin_dashboard_stats');
      if (error) throw error;
      return data;
    },
  });

  const stats = {
    users: data?.users ?? 0,
    chambas: data?.chambas ?? 0,
    revenue: Number(data?.revenue ?? 0),
    commission: Number(data?.commission ?? 0),
    reports: data?.reports ?? 0,
    activeUsers: data?.activeUsers ?? 0,
  };

  const pendingTx = data?.pendingTx ?? [];

  const recentActivity = (data?.recentActivity ?? []).map((a) => ({
    id: a.id,
    text: a.full_name ? `${actionText(a.action)} · ${a.full_name}` : actionText(a.action),
    time: relTime(a.created_at),
    icon: actionIcon(a.action),
  }));

  const txMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const { error } = await supabase.from('wallet_transactions').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['wallet_transactions'] });
    },
  });

  const handleApprove = (id) => txMutation.mutate({ id, status: 'completed' });
  const handleReject = (id) => {
    if (!window.confirm('¿Rechazar esta transacción?')) return;
    txMutation.mutate({ id, status: 'failed' });
  };

  return {
    stats,
    pendingTx,
    recentActivity,
    loading: isLoading,
    error: error ? (error.message ?? 'Error') : null,
    handleApprove,
    handleReject,
  };
}
