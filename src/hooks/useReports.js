import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { usePagedQuery } from './usePagedQuery';

// Feed unificado de reportes (perfil/chamba/empleo/alerta) vía RPC server-side
// `admin_reports_list` (joins polimórficos + total, gateado por is_admin), y las
// acciones de moderación vía `admin_resolve_report` (contrato { ok, code }).
const KEY = ['reports'];

export function useReports(status, entityType) {
  const qc = useQueryClient();

  const paged = usePagedQuery({
    key: KEY,
    pageSize: 15,
    deps: [status, entityType],
    queryFn: async ({ from, to }) => {
      const { data, error } = await supabase.rpc('admin_reports_list', {
        p_status: status ?? null,
        p_entity_type: entityType ?? null,
        p_limit: to - from + 1,
        p_offset: from,
      });
      if (error) throw error;
      return { rows: data?.rows ?? [], total: data?.total ?? 0 };
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ reportId, action, notify = true }) => {
      const { data, error } = await supabase.rpc('admin_resolve_report', {
        p_report_id: reportId,
        p_action: action,
        p_notify: notify,
      });
      if (error) throw error;
      if (data && data.ok === false) throw new Error(data.code || 'No se pudo resolver el reporte');
      return data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['chambas'] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Devuelve la promesa (mutateAsync) para que la vista pueda await + toast.
  const resolveReport = (reportId, action, notify = true) =>
    resolveMutation.mutateAsync({ reportId, action, notify });

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
