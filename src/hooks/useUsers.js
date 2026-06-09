import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useDebounce } from './useDebounce';
import { usePagedQuery } from './usePagedQuery';

const KEY = ['users'];

export function useUsers() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [city, setCity] = useState('');        // '' = todas
  const [ageBand, setAgeBand] = useState('all'); // all | 18-24 | 25-34 | 35-44 | 45-54 | 55+ | none
  const [sort, setSort] = useState('created_at'); // created_at | last_seen | age | full_name
  const [dir, setDir] = useState('desc');          // asc | desc
  const search = useDebounce(searchInput, 350);

  // Ciudades disponibles para el dropdown de filtro (cacheadas 10 min).
  const { data: cities = [] } = useQuery({
    queryKey: ['users', 'cities'],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_user_cities');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Listado server-side con filtros, orden y `last_seen` por usuario
  // (RPC admin_users_list). Antes era un .from('users') simple; ahora el orden
  // por "última conexión" exige el join con analytics_events, hecho en Postgres.
  const paged = usePagedQuery({
    key: KEY,
    deps: [search, city, ageBand, sort, dir],
    queryFn: async ({ from, to }) => {
      const { data, error } = await supabase.rpc('admin_users_list', {
        p_search: search || null,
        p_city: city || null,
        p_age_band: ageBand,
        p_sort: sort,
        p_dir: dir,
        p_limit: to - from + 1,
        p_offset: from,
      });
      if (error) throw error;
      return { rows: data?.rows ?? [], total: data?.total ?? 0 };
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
    city, setCity,
    ageBand, setAgeBand,
    sort, setSort,
    dir, setDir,
    cities,
    setBanned,
    deleteUser,
  };
}
