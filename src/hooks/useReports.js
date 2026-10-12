import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { usePagedQuery } from './usePagedQuery';
import { invalidateModeration, unwrapModerationResult } from './useModeration';

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
    mutationFn: async ({ reportId, action, notify = true, message = null }) => {
      const res = await supabase.rpc('admin_resolve_report', {
        p_report_id: reportId,
        p_action: action,
        p_notify: notify,
        // Vacío → el servidor usa su texto por defecto.
        p_message: message?.trim() || null,
      });
      return unwrapModerationResult(res, 'No se pudo resolver el reporte.');
    },
    onSettled: () => invalidateModeration(qc),
  });

  // Devuelve la promesa (mutateAsync) para que la vista pueda await + toast.
  // Resuelve con { ok, status, resolution, closed }: `closed` es cuántos reportes
  // del mismo contenido quedaron cerrados.
  const resolveReport = (reportId, action, { notify = true, message = null } = {}) =>
    resolveMutation.mutateAsync({ reportId, action, notify, message });

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

// Trae el registro reportado por id para poder abrirlo desde la tarjeta. Los
// `select` de chamba y empleo son los mismos que usan sus tablas, así los
// modales de detalle reciben la misma forma de fila.
export function useReportedEntity(entityType, entityId) {
  return useQuery({
    queryKey: [...KEY, 'entity', entityType, entityId],
    enabled: !!entityType && !!entityId,
    queryFn: async () => {
      const table = { user: 'users', chamba: 'chambas', job: 'jobs', alert: 'alerts' }[entityType];
      if (!table) return null;
      const select = {
        chamba: '*, employer:users(full_name, email)',
        job: '*, employer:users!jobs_user_id_fkey(full_name, email)',
      }[entityType] || '*';
      const { data, error } = await supabase.from(table).select(select).eq('id', entityId).maybeSingle();
      if (error) throw error;
      return data; // null si ya no existe
    },
  });
}
