import { useState } from 'react';
import { supabase } from '../lib/supabase';

// El broadcast se orquesta 100% en el servidor (api/broadcast.js): el navegador ya
// NO baja los push_token ni habla con Expo. Solo manda { title, body } + el JWT del
// admin; el servidor resuelve destinatarios (RPC), envía, limpia tokens muertos y
// registra el log.
export function useNotifications() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { sent, failed, cleaned }
  const [error, setError] = useState(null);

  const sendToAll = async (title, body, data = {}) => {
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');

      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, body, data }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Error al enviar la notificación');

      setResult(json);
      return json;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setSending(false);
    }
  };

  // Conteo de destinatarios para el modal de confirmación (RPC admin-gateada).
  const getTokenCount = async () => {
    const { data, error } = await supabase.rpc('admin_notifiable_count');
    if (error) return 0;
    return data ?? 0;
  };

  return { sending, result, error, sendToAll, getTokenCount };
}
