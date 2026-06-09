import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useDebounce } from './useDebounce';
import { usePagedQuery } from './usePagedQuery';

const KEY = ['chambas'];
const sanitize = (s) => s.replace(/[,()*]/g, ' ').trim();

export function useChambas() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 350);

  const paged = usePagedQuery({
    key: KEY,
    deps: [search],
    queryFn: async ({ from, to }) => {
      let q = supabase
        .from('chambas')
        .select('*, employer:users(full_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      const term = sanitize(search);
      if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const patchRow = (id, fields) =>
    qc.setQueriesData({ queryKey: KEY }, (old) =>
      old?.rows ? { ...old, rows: old.rows.map((c) => (c.id === id ? { ...c, ...fields } : c)) } : old
    );
  const removeRow = (id) =>
    qc.setQueriesData({ queryKey: KEY }, (old) =>
      old?.rows
        ? { ...old, rows: old.rows.filter((c) => c.id !== id), total: Math.max(0, (old.total ?? 0) - 1) }
        : old
    );

  const statusMutation = useMutation({
    mutationFn: async ({ id, newStatus }) => {
      const { error } = await supabase.from('chambas').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, newStatus }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const snapshot = qc.getQueriesData({ queryKey: KEY });
      patchRow(id, { status: newStatus });
      return { snapshot };
    },
    onError: (_e, _v, ctx) => ctx?.snapshot?.forEach(([k, d]) => qc.setQueryData(k, d)),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('chambas').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY });
      const snapshot = qc.getQueriesData({ queryKey: KEY });
      removeRow(id);
      return { snapshot };
    },
    onError: (_e, _v, ctx) => ctx?.snapshot?.forEach(([k, d]) => qc.setQueryData(k, d)),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const updateStatus = async (id, newStatus) => {
    try { await statusMutation.mutateAsync({ id, newStatus }); } catch { /* revertido */ }
  };
  const deleteChamba = async (id) => {
    try { await deleteMutation.mutateAsync(id); } catch { /* revertido */ }
  };

  return {
    chambas: paged.rows,
    loading: paged.loading,
    isFetching: paged.isFetching,
    error: paged.error,
    page: paged.page,
    setPage: paged.setPage,
    totalPages: paged.totalPages,
    total: paged.total,
    pageSize: paged.pageSize,
    search: searchInput,
    setSearch: setSearchInput,
    updateStatus,
    deleteChamba,
  };
}
