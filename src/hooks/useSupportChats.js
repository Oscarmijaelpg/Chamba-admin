import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Chat de soporte: conversaciones de la cuenta admin con los usuarios
// (server/migrations/admin_support_chat.sql). Sin Realtime a propósito (ver
// incidente de Realtime en el Micro): se refresca cada pocos segundos mientras
// la vista está abierta.
const KEY = ['support_chats'];

export function useSupportChats({ refetchInterval = 15_000, enabled = true } = {}) {
  return useQuery({
    queryKey: KEY,
    enabled,
    refetchInterval,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_support_chats');
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.code);
      return data?.chats ?? [];
    },
  });
}

// Mensajes de un chat. La RLS de `messages` ya deja leer al admin porque es
// participante. Al abrirlo marca como leído lo que escribió el usuario.
export function useChatMessages(chatId) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: [...KEY, 'messages', chatId],
    enabled: !!chatId,
    refetchInterval: 6_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at, read_at, message_type, image_url, file_url, file_name')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      if ((data ?? []).some((m) => m.sender_id !== user?.id && !m.read_at)) {
        await supabase.rpc('mark_messages_read', { p_chat_id: chatId });
        qc.invalidateQueries({ queryKey: KEY, exact: true });
      }
      return data ?? [];
    },
  });
}

export function useChatReply(chatId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (message) => {
      const { data, error } = await supabase.rpc('admin_chat_reply', { p_chat_id: chatId, p_message: message });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.code);
      return data;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'messages', chatId] });
      qc.invalidateQueries({ queryKey: KEY, exact: true });
    },
  });
}
