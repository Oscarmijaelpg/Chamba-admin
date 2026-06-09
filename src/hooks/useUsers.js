import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useDebounce } from './useDebounce';
import { usePagedQuery } from './usePagedQuery';

const KEY = ['users'];

// PostgREST .or() usa comas/paréntesis como separadores: limpiamos el término
// para que la búsqueda no rompa la sintaxis del filtro.
const sanitize = (s) => s.replace(/[,()*]/g, ' ').trim();

export function useUsers() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 350);

  const paged = usePagedQuery({
    key: KEY,
    deps: [search],
    queryFn: async ({ from, to }) => {
      let q = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      const term = sanitize(search);
      if (term) q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  // Parchea una fila en todas las páginas cacheadas (update optimista).
  const patchRow = (id, fields) =>
    qc.setQueriesData({ queryKey: KEY }, (old) =>
      old?.rows ? { ...old, rows: old.rows.map((u) => (u.id === id ? { ...u, ...fields } : u)) } : old
    );

  const banMutation = useMutation({
    mutationFn: async ({ userId, isBanned }) => {
      const { error } = await supabase.from('users').update({ is_banned: isBanned }).eq('id', userId);
      if (error) throw error;
    },
    onMutate: async ({ userId, isBanned }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const snapshot = qc.getQueriesData({ queryKey: KEY });
      patchRow(userId, { is_banned: isBanned });
      return { snapshot };
    },
    onError: (_e, _v, ctx) => ctx?.snapshot?.forEach(([k, d]) => qc.setQueryData(k, d)),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId) => {
      const { error } = await supabase.rpc('admin_delete_user', { target_id: userId });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  // Firma compatible con el componente: devuelven el error (o null).
  const setBanned = async (userId, isBanned) => {
    try { await banMutation.mutateAsync({ userId, isBanned }); return null; }
    catch (e) { return e; }
  };
  const deleteUser = async (userId) => {
    try { await deleteMutation.mutateAsync(userId); return null; }
    catch (e) { return e; }
  };

  return {
    users: paged.rows,
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
    setBanned,
    deleteUser,
  };
}
