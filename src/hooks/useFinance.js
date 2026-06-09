import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { usePagedQuery } from './usePagedQuery';

const KEY = ['wallet_transactions'];

export function useFinance(filter = 'all') {
  const qc = useQueryClient();

  const paged = usePagedQuery({
    key: KEY,
    deps: [filter],
    queryFn: async ({ from, to }) => {
      let q = supabase
        .from('wallet_transactions')
        .select('*, users(full_name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (filter !== 'all') q = q.eq('status', filter);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  // Retiros pendientes: conjunto pequeño e independiente de la paginación principal.
  const withdrawalsQuery = useQuery({
    queryKey: [...KEY, 'pending_withdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*, users(full_name, email)')
        .eq('type', 'withdrawal')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const patchRow = (id, fields) =>
    qc.setQueriesData({ queryKey: KEY }, (old) =>
      old?.rows ? { ...old, rows: old.rows.map((t) => (t.id === id ? { ...t, ...fields } : t)) } : old
    );

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const { error } = await supabase.from('wallet_transactions').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const snapshot = qc.getQueriesData({ queryKey: KEY });
      patchRow(id, { status });
      return { snapshot };
    },
    onError: (_e, _v, ctx) => ctx?.snapshot?.forEach(([k, d]) => qc.setQueryData(k, d)),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const approveTransaction = (id) => statusMutation.mutate({ id, status: 'completed' });
  const rejectTransaction = (id) => statusMutation.mutate({ id, status: 'cancelled' });

  return {
    transactions: paged.rows,
    pendingWithdrawals: withdrawalsQuery.data ?? [],
    loading: paged.loading,
    isFetching: paged.isFetching,
    error: paged.error,
    page: paged.page,
    setPage: paged.setPage,
    totalPages: paged.totalPages,
    total: paged.total,
    pageSize: paged.pageSize,
    approveTransaction,
    rejectTransaction,
  };
}
