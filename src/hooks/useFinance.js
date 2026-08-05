import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { usePagedQuery } from './usePagedQuery';

const KEY = ['wallet_transactions'];

// `view` combina tipo + estado en un solo filtro simple:
//   'all' · 'pending' (por aprobar) · o un tipo (deposit/withdrawal/payout/commission).
export function useFinance(view = 'all') {
  const qc = useQueryClient();

  const paged = usePagedQuery({
    key: KEY,
    deps: [view],
    queryFn: async ({ from, to }) => {
      let q = supabase
        .from('wallet_transactions')
        .select('*, users(full_name, email, public_contact)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (view === 'pending') q = q.eq('status', 'pending');
      else if (view !== 'all') q = q.eq('type', view);
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

  // Resumen financiero para KPIs y gráficos (RPC admin_wallet_summary).
  const summaryQuery = useQuery({
    queryKey: [...KEY, 'summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_wallet_summary');
      if (error) throw error;
      return data;
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
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });

  // Recarga manual de saldo a un usuario (RPC admin_credit_wallet, atómica).
  const creditMutation = useMutation({
    mutationFn: async ({ userId, amount, reason }) => {
      const { data, error } = await supabase.rpc('admin_credit_wallet', {
        p_user_id: userId, p_amount: amount, p_reason: reason ?? null,
      });
      if (error) throw error;
      if (data && data.ok === false) throw new Error(data.code || 'No se pudo recargar');
      return data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });

  const approveTransaction = (id) => statusMutation.mutate({ id, status: 'completed' });
  const rejectTransaction = (id) => statusMutation.mutate({ id, status: 'cancelled' });
  const creditWallet = (userId, amount, reason) => creditMutation.mutateAsync({ userId, amount, reason });

  // Búsqueda de usuarios para la recarga (nombre o email).
  // El saldo sale de `wallets`, que es la fuente de verdad. La columna
  // `users.wallet_balance` es solo un espejo derivado y está deprecada.
  const searchUsers = async (term) => {
    const t = (term ?? '').trim();
    if (t.length < 2) return [];
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, wallet:wallets(balance, held_balance)')
      .or(`full_name.ilike.%${t}%,email.ilike.%${t}%`)
      .limit(8);
    if (error) return [];
    // El embed llega como objeto o como array según la cardinalidad que
    // detecte PostgREST; se normaliza acá para que la vista no se entere.
    return (data ?? []).map((u) => {
      const w = Array.isArray(u.wallet) ? u.wallet[0] : u.wallet;
      return { ...u, balance: w?.balance ?? 0, held_balance: w?.held_balance ?? 0 };
    });
  };

  return {
    transactions: paged.rows,
    pendingWithdrawals: withdrawalsQuery.data ?? [],
    summary: summaryQuery.data ?? null,
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
    creditWallet,
    crediting: creditMutation.isPending,
    searchUsers,
  };
}
