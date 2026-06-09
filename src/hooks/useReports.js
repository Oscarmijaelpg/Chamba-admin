import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { usePagedQuery } from './usePagedQuery';

const KEY = ['chamba_reports'];

export function useReports(filter) {
  const qc = useQueryClient();

  const paged = usePagedQuery({
    key: KEY,
    pageSize: 15,
    deps: [filter],
    queryFn: async ({ from, to }) => {
      const { data, count, error } = await supabase
        .from('chamba_reports')
        .select(
          '*, reporter:users!reporter_id(full_name), chamba:chambas!chamba_id(title, status, employer_id)',
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
    mutationFn: async ({ reportId, chambaId, deleteChamba }) => {
      if (deleteChamba && chambaId) {
        const { error: delErr } = await supabase.from('chambas').delete().eq('id', chambaId);
        if (delErr) throw delErr;
      }
      const { error } = await supabase.from('chamba_reports').update({ status: 'resolved' }).eq('id', reportId);
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['chambas'] });
    },
  });

  const resolveReport = (reportId, chambaId, deleteChamba) =>
    resolveMutation.mutate({ reportId, chambaId, deleteChamba });

  return {
    reports: paged.rows,
    loading: paged.loading,
    isFetching: paged.isFetching,
    error: paged.error,
    page: paged.page,
    setPage: paged.setPage,
    totalPages: paged.totalPages,
    total: paged.total,
    pageSize: paged.pageSize,
    resolveReport,
  };
}
