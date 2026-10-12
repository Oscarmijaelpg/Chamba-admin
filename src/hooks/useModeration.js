import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Moderación directa (sin que exista un reporte) vía RPC `admin_moderate`, y el
// historial de una cuenta vía `admin_user_moderation_history`. Las dos validan
// is_admin() en el servidor y devuelven el contrato { ok, code }.
const HISTORY_KEY = ['moderation', 'history'];

// Códigos que devuelven las RPC de moderación → texto para el admin.
const ERROR_MESSAGES = {
  forbidden: 'Tu cuenta no tiene permisos de administrador.',
  not_found: 'El contenido ya no existe (puede que su autor lo haya borrado).',
  bad_action: 'Esa acción no es válida.',
  bad_target: 'Esa acción no se puede aplicar a este tipo de contenido.',
  no_owner: 'Este aviso no tiene una cuenta dueña (lo trajo el scraper): solo se puede eliminar.',
  target_is_admin: 'No se puede suspender a un administrador.',
  escrow_in_progress: 'La chamba tiene un pago en custodia y un trabajador elegido: se resuelve desde Disputas, no eliminándola.',
  already_resolved: 'Este reporte ya fue resuelto.',
};

export function moderationErrorMessage(code, fallback = 'No se pudo completar la acción.') {
  return ERROR_MESSAGES[code] || fallback;
}

// Normaliza la respuesta de una RPC de moderación: lanza un Error con mensaje en
// español (y `code` con el código original) si el servidor rechazó la acción.
export function unwrapModerationResult({ data, error }, fallback) {
  if (error) {
    // Mientras la migración no esté aplicada, PostgREST no encuentra la función.
    if (error.code === 'PGRST202') {
      throw new Error('El servidor todavía no tiene esta función de moderación (falta aplicar la migración).');
    }
    throw new Error(error.message || fallback);
  }
  if (!data || data.ok === false) {
    const err = new Error(moderationErrorMessage(data?.code, fallback));
    err.code = data?.code;
    throw err;
  }
  return data;
}

// Todo lo que una acción de moderación puede cambiar en pantalla.
export function invalidateModeration(qc) {
  qc.invalidateQueries({ queryKey: ['reports'] });
  qc.invalidateQueries({ queryKey: ['chambas'] });
  qc.invalidateQueries({ queryKey: ['jobs'] });
  qc.invalidateQueries({ queryKey: ['users'] });
  qc.invalidateQueries({ queryKey: HISTORY_KEY });
}

export function useModeration() {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ action, entityType, entityId, message, notify = true }) => {
      const res = await supabase.rpc('admin_moderate', {
        p_action: action,
        p_entity_type: entityType,
        p_entity_id: entityId,
        // Vacío → el servidor usa su texto por defecto.
        p_message: message?.trim() || null,
        p_notify: notify,
      });
      return unwrapModerationResult(res, 'No se pudo aplicar la acción de moderación.');
    },
    onSettled: () => invalidateModeration(qc),
  });

  return { moderate: mutation.mutateAsync, moderating: mutation.isPending };
}

// Sanciones aplicadas y reportes recibidos por una cuenta.
export function useModerationHistory(userId) {
  return useQuery({
    queryKey: [...HISTORY_KEY, userId],
    enabled: !!userId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_user_moderation_history', { p_user_id: userId });
      if (error) throw error;
      return data;
    },
  });
}

const DONE_MESSAGES = {
  warn: 'Advertencia registrada.',
  remove_content: 'Aviso eliminado.',
  ban: 'Cuenta suspendida.',
  unban: 'Cuenta reactivada.',
};

// Estado del diálogo de moderación para las tablas: qué se está por hacer, la
// llamada y el error. Devuelve `dialogProps` listo para <ModerationActionModal>.
//
//   open({ action, entityType, entityId, targetName, contentTitle })
//
// Si falla, el diálogo queda abierto mostrando el motivo. Si sale bien se cierra
// y se llama a `onDone(mensaje, resultado)`.
export function useModerationDialog({ onDone } = {}) {
  const { moderate } = useModeration();
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const open = (next) => { setError(null); setTarget(next); };
  const close = () => { if (!loading) setTarget(null); };

  const confirm = async ({ message, notify }) => {
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      const result = await moderate({
        action: target.action, entityType: target.entityType, entityId: target.entityId, message, notify,
      });
      let msg = DONE_MESSAGES[target.action] || 'Acción aplicada.';
      if (notify && result.notified === false) msg += ' No se pudo notificar al usuario.';
      if (result.closed > 0) msg += ` Se cerraron ${result.closed} reporte(s) pendientes.`;
      setTarget(null);
      onDone?.(msg, result);
    } catch (e) {
      setError(e?.message || 'No se pudo aplicar la acción de moderación.');
    } finally {
      setLoading(false);
    }
  };

  return {
    open,
    dialogProps: {
      isOpen: !!target,
      action: target?.action,
      entityType: target?.entityType,
      targetName: target?.targetName,
      contentTitle: target?.contentTitle,
      onClose: close,
      onConfirm: confirm,
      loading,
      error,
    },
  };
}
