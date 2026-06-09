import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useDebounce } from './useDebounce';
import { usePagedQuery } from './usePagedQuery';

const KEY = ['audit_logs'];
const sanitize = (s) => s.replace(/[,()*]/g, ' ').trim();

function gteFor(dateRange) {
  if (dateRange === 'today') return new Date().toISOString().split('T')[0];
  if (dateRange === 'week') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }
  if (dateRange === 'month') {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString();
  }
  return null; // 'all'
}

export function useAuditLogs(actionFilter, dateRange) {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 350);

  const paged = usePagedQuery({
    key: KEY,
    pageSize: 25,
    deps: [actionFilter, dateRange, search],
    queryFn: async ({ from, to }) => {
      let q = supabase
        .from('audit_logs')
        .select('*, user:users(full_name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      const gte = gteFor(dateRange);
      if (gte) q = q.gte('created_at', gte);
      if (actionFilter !== 'all') q = q.like('action', `${actionFilter}%`);
      const term = sanitize(search);
      if (term) q = q.ilike('action', `%${term}%`);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  // Tarjetas de resumen: conteos por categoría respetando el rango de fechas.
  const statsQuery = useQuery({
    queryKey: [...KEY, 'stats', dateRange],
    queryFn: async () => {
      const gte = gteFor(dateRange);
      const base = () => {
        let b = supabase.from('audit_logs').select('*', { count: 'exact', head: true });
        if (gte) b = b.gte('created_at', gte);
        return b;
      };
      const [t, u, c, p] = await Promise.all([
        base(),
        base().like('action', 'user%'),
        base().like('action', 'chamba%'),
        base().like('action', 'payment%'),
      ]);
      return { total: t.count ?? 0, users: u.count ?? 0, chambas: c.count ?? 0, payments: p.count ?? 0 };
    },
  });

  return {
    logs: paged.rows,
    loading: paged.loading,
    isFetching: paged.isFetching,
    error: paged.error,
    stats: statsQuery.data ?? { total: 0, users: 0, chambas: 0, payments: 0 },
    page: paged.page,
    setPage: paged.setPage,
    totalPages: paged.totalPages,
    total: paged.total,
    pageSize: paged.pageSize,
    search: searchInput,
    setSearch: setSearchInput,
    refresh: () => qc.invalidateQueries({ queryKey: KEY }),
  };
}
