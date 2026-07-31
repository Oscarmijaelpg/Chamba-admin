import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { usePagedQuery } from './usePagedQuery';

const KEY = ['disputes'];

// Disputas de pago en custodia (escrow). El admin media: liberar al trabajador,
// devolver al empleador, o dividir. El movimiento de dinero lo hace la RPC
// SECURITY DEFINER `admin_resolve_dispute` (atómica, chequea is_admin).
export function useDisputes(filter) {
  const qc = useQueryClient();

  const paged = usePagedQuery({
    key: KEY,
    pageSize: 15,
    deps: [filter],
    queryFn: async ({ from, to }) => {
      const { data, count, error } = await supabase
        .from('disputes')
        .select(
          '*, chamba:chambas!chamba_id(title, employer_id), opener:users!opened_by(full_name), against:users!against_id(full_name)',
          { count: 'exact' }
        )
        .eq('status', filter)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ disputeId, resolution, workerAmount = 0, employerAmount = 0 }) => {
      const { data, error } = await supabase.rpc('admin_resolve_dispute', {
        p_dispute_id: disputeId,
        p_resolution: resolution,
        p_worker_amount: workerAmount,
        p_employer_amount: employerAmount,
      });
      if (error) throw error;
      if (data && data.ok === false) throw new Error(data.code || 'No se pudo resolver');
      return data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['wallet_transactions'] });
    },
  });

  return {
    disputes: paged.rows,
    loading: paged.loading,
    isFetching: paged.isFetching,
    error: paged.error,
    page: paged.page,
    setPage: paged.setPage,
    totalPages: paged.totalPages,
    total: paged.total,
    pageSize: paged.pageSize,
    resolve: resolveMutation.mutateAsync,
    resolving: resolveMutation.isPending,
  };
}
