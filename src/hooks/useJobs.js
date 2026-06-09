import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useDebounce } from './useDebounce';
import { usePagedQuery } from './usePagedQuery';

const KEY = ['jobs'];
const sanitize = (s) => s.replace(/[,()*]/g, ' ').trim();

export function useJobs() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('all');
  const [city, setCity] = useState('all');
  const [source, setSource] = useState('all');
  const search = useDebounce(searchInput, 350);

  const paged = usePagedQuery({
    key: KEY,
    deps: [search, status, city, source],
    queryFn: async ({ from, to }) => {
      let q = supabase
        .from('jobs')
        // Desambiguar la relación: hay más de una FK jobs↔users, hay que nombrar la
        // constraint o PostgREST falla con PGRST201.
        .select('*, employer:users!jobs_user_id_fkey(full_name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      const term = sanitize(search);
      if (term) q = q.or(`title.ilike.%${term}%,company.ilike.%${term}%`);
      if (status !== 'all') q = q.eq('status', status);
      if (city !== 'all') q = q.eq('city', city);
      if (source === 'external') q = q.eq('is_external', true);
      else if (source === 'own') q = q.eq('is_external', false);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  // KPIs globales (no se pueden derivar de una sola página).
  const statsQuery = useQuery({
    queryKey: ['jobs', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_jobs_stats');
      if (error) throw error;
      return data; // { total, external }
    },
  });

  // Opciones del filtro de ciudad desde la tabla maestra (no de la página actual).
  const citiesQuery = useQuery({
    queryKey: ['job_cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_cities')
        .select('name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((c) => c.name).filter(Boolean);
    },
    staleTime: 10 * 60_000,
  });

  const patchRow = (id, fields) =>
    qc.setQueriesData({ queryKey: KEY }, (old) =>
      old?.rows ? { ...old, rows: old.rows.map((j) => (j.id === id ? { ...j, ...fields } : j)) } : old
    );
  const removeRow = (id) =>
    qc.setQueriesData({ queryKey: KEY }, (old) =>
      old?.rows
        ? { ...old, rows: old.rows.filter((j) => j.id !== id), total: Math.max(0, (old.total ?? 0) - 1) }
        : old
    );

  const updateMutation = useMutation({
    mutationFn: async ({ id, fields }) => {
      const { error } = await supabase.from('jobs').update(fields).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, fields }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const snapshot = qc.getQueriesData({ queryKey: KEY });
      patchRow(id, fields);
      return { snapshot };
    },
    onError: (_e, _v, ctx) => ctx?.snapshot?.forEach(([k, d]) => qc.setQueryData(k, d)),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
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
    try { await updateMutation.mutateAsync({ id, fields: { status: newStatus } }); } catch { /* revertido en onError */ }
  };
  const updateJob = async (id, fields) => {
    try { await updateMutation.mutateAsync({ id, fields }); return true; } catch { return false; }
  };
  const deleteJob = async (id) => {
    try { await deleteMutation.mutateAsync(id); } catch { /* revertido en onError */ }
  };

  const total = statsQuery.data?.total ?? 0;
  const external = statsQuery.data?.external ?? 0;

  return {
    jobs: paged.rows,
    loading: paged.loading,
    isFetching: paged.isFetching,
    error: paged.error,
    // KPIs globales
    stats: { total, external, own: Math.max(0, total - external) },
    // opciones de filtros
    cities: citiesQuery.data ?? [],
    // paginación
    page: paged.page,
    setPage: paged.setPage,
    totalPages: paged.totalPages,
    pageTotal: paged.total, // total que coincide con los filtros actuales
    pageSize: paged.pageSize,
    // filtros / búsqueda
    search: searchInput,
    setSearch: setSearchInput,
    status,
    setStatus,
    city,
    setCity,
    source,
    setSource,
    // mutaciones
    updateStatus,
    updateJob,
    deleteJob,
  };
}
