import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useDebounce } from './useDebounce';
import { usePagedQuery } from './usePagedQuery';

const KEY = ['chambas'];
const sanitize = (s) => s.replace(/[,()*]/g, ' ').trim();

export function useChambas() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('all');
  const [city, setCity] = useState('all');
  const search = useDebounce(searchInput, 350);

  const paged = usePagedQuery({
    key: KEY,
    deps: [search, status, city],
    queryFn: async ({ from, to }) => {
      let q = supabase
        .from('chambas')
        .select('*, employer:users(full_name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      const term = sanitize(search);
      if (term) q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
      // 'all' oculta las borradas lógicamente; un estado puntual las muestra.
      if (status === 'all') q = q.neq('status', 'deleted');
      else q = q.eq('status', status);
      if (city !== 'all') q = q.eq('city', city);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  // KPIs globales (RPC admin_chambas_stats).
  const statsQuery = useQuery({
    queryKey: ['chambas', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_chambas_stats');
      if (error) throw error;
      return data;
    },
  });

  // Ciudades (reusa la tabla maestra de job_cities — mismo set boliviano).
  const citiesQuery = useQuery({
    queryKey: ['job_cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_cities').select('name').eq('is_active', true)
        .order('sort_order', { ascending: true }).order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((c) => c.name).filter(Boolean);
    },
    staleTime: 10 * 60_000,
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

  const updateMutation = useMutation({
    mutationFn: async ({ id, fields }) => {
      const { error } = await supabase.from('chambas').update(fields).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, fields }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const snapshot = qc.getQueriesData({ queryKey: KEY });
      patchRow(id, fields);
      return { snapshot };
    },
    onError: (_e, _v, ctx) => ctx?.snapshot?.forEach(([k, d]) => qc.setQueryData(k, d)),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['chambas', 'stats'] });
    },
  });

  // Borrado LÓGICO (status='deleted'): no rompe postulaciones/pagos/reseñas y es
  // lo que hace la app. Optimista: saca la fila de la lista al instante.
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('chambas').update({ status: 'deleted' }).eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY });
      const snapshot = qc.getQueriesData({ queryKey: KEY });
      removeRow(id);
      return { snapshot };
    },
    onError: (_e, _v, ctx) => ctx?.snapshot?.forEach(([k, d]) => qc.setQueryData(k, d)),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['chambas', 'stats'] });
    },
  });

  const updateStatus = async (id, newStatus) => {
    try { await updateMutation.mutateAsync({ id, fields: { status: newStatus } }); } catch { /* revertido */ }
  };
  const updateChamba = async (id, fields) => {
    try { await updateMutation.mutateAsync({ id, fields }); return true; } catch { return false; }
  };
  const deleteChamba = async (id) => {
    try { await deleteMutation.mutateAsync(id); } catch { /* revertido */ }
  };

  const s = statsQuery.data ?? {};

  return {
    chambas: paged.rows,
    loading: paged.loading,
    isFetching: paged.isFetching,
    error: paged.error,
    stats: {
      total: s.total ?? 0, open: s.open ?? 0, in_progress: s.in_progress ?? 0,
      completed: s.completed ?? 0, cancelled: s.cancelled ?? 0,
      protected: s.protected ?? 0, escrow_held: s.escrow_held ?? 0,
    },
    cities: citiesQuery.data ?? [],
    page: paged.page,
    setPage: paged.setPage,
    totalPages: paged.totalPages,
    total: paged.total,
    pageTotal: paged.total,
    pageSize: paged.pageSize,
    search: searchInput,
    setSearch: setSearchInput,
    status,
    setStatus,
    city,
    setCity,
    updateStatus,
    updateChamba,
    deleteChamba,
  };
}
