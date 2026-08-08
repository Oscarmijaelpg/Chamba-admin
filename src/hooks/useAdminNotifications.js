import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const KEY = ['admin_notifications'];
const LIMIT = 50;

/**
 * Bandeja de avisos del equipo (`admin_notifications`).
 *
 * El push se puede perder —device apagado, TTL vencido, permiso revocado—, así
 * que el historial es lo que garantiza que un retiro pendiente no se evapore.
 *
 * Refresco: polling de 60s + el aviso que manda el service worker cuando llega
 * un push. Deliberadamente NO usa Realtime de Supabase: el proyecto es Micro y
 * ya se saturó una vez por eso (ver memoria realtime-micro-overload). Con uno o
 * dos admins, un minuto de latencia en el peor caso es intrascendente.
 */
export function useAdminNotifications(userId) {
  const qc = useQueryClient();

  const listQuery = useQuery({
    queryKey: [...KEY, userId],
    enabled: !!userId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(LIMIT);
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = useCallback(() => qc.invalidateQueries({ queryKey: KEY }), [qc]);

  // El service worker avisa apenas entra un push: la campana se actualiza sin
  // esperar al siguiente refetch.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event) => {
      if (event.data?.type === 'admin-notification') invalidate();
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [invalidate]);

  const markRead = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);
      if (error) throw error;
    },
    onSettled: invalidate,
  });

  const items = listQuery.data ?? [];

  return {
    items,
    unreadCount: items.filter((n) => !n.read_at).length,
    loading: listQuery.isLoading,
    error: listQuery.error,
    markRead: (id) => markRead.mutate(id),
    markAllRead: () => markAllRead.mutate(),
    markingAll: markAllRead.isPending,
  };
}
