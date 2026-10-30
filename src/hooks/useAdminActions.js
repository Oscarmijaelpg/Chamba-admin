import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// RPCs admin de server/migrations/admin_panel_v2.sql. Todas validan is_admin()
// en el servidor y devuelven { ok, code, ... }.

const ERROR_TEXT = {
  forbidden: 'No tenés permisos de administrador.',
  not_found: 'Ya no existe.',
  no_owner: 'Este aviso lo trajo el scraper: no tiene una cuenta a la que escribirle.',
  empty_message: 'Escribí un mensaje.',
  not_open: 'Solo se puede pausar una publicación abierta.',
  not_paused: 'Esta publicación no está pausada.',
  bad_amount: 'El monto tiene que ser mayor a 0.',
  not_pending: 'Este movimiento ya no está pendiente.',
  not_deposit: 'Solo las recargas se aprueban con monto.',
};
export const adminErrorText = (code) => ERROR_TEXT[code] || 'No se pudo completar la acción.';

async function callRpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  if (data && data.ok === false) {
    const e = new Error(adminErrorText(data.code));
    e.code = data.code;
    throw e;
  }
  return data;
}

// Ficha completa: datos privados, sesión, billetera, publicaciones,
// postulaciones, reseñas y movimientos.
export function useUserDetail(userId) {
  return useQuery({
    queryKey: ['user_detail', userId],
    enabled: !!userId,
    queryFn: () => callRpc('admin_user_detail', { p_user_id: userId }),
  });
}

// Vistas de una chamba o empleo (eventos view_chamba / view_job).
export function useContentViews(entityType, entityId) {
  return useQuery({
    queryKey: ['content_views', entityType, entityId],
    enabled: !!entityId,
    staleTime: 60_000,
    queryFn: () => callRpc('admin_content_views', { p_entity_type: entityType, p_entity_id: entityId }),
  });
}

export function useMessageUser() {
  return useMutation({
    mutationFn: ({ entityType, entityId, message }) =>
      callRpc('admin_message_user', { p_entity_type: entityType, p_entity_id: entityId, p_message: message }),
  });
}

// Recarga: se aprueba por el monto que el admin confirma (el que realmente
// llegó). La RPC fija el monto y aprueba en la misma sentencia (el trigger
// acredita ese monto) y le explica la diferencia al usuario.
export function useApproveDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, note }) =>
      callRpc('admin_approve_deposit', { p_tx_id: id, p_amount: amount, p_note: note || null }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['wallet_transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSetPaused() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, entityId, paused, message, notify = true }) =>
      callRpc('admin_set_paused', {
        p_entity_type: entityType, p_entity_id: entityId, p_paused: paused,
        p_message: message || null, p_notify: notify,
      }),
    onSettled: (_d, _e, { entityType }) => {
      qc.invalidateQueries({ queryKey: [entityType === 'job' ? 'jobs' : 'chambas'] });
      qc.invalidateQueries({ queryKey: ['user_detail'] });
    },
  });
}
