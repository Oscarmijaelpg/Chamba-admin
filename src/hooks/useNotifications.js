import { useState } from 'react';
import { supabase } from '../lib/supabase';

const EXPO_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export function useNotifications() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { sent, failed }
  const [error, setError] = useState(null);

  const sendToAll = async (title, body, data = {}) => {
    setSending(true);
    setResult(null);
    setError(null);

    try {
      const { data: users, error: dbError } = await supabase
        .from('users')
        .select('id, push_token')
        .not('push_token', 'is', null);

      if (dbError) throw new Error(dbError.message);

      const tokens = users.map(u => u.push_token).filter(Boolean);
      if (tokens.length === 0) {
        setResult({ sent: 0, failed: 0 });
        return { sent: 0, failed: 0 };
      }

      const chunks = chunk(tokens, CHUNK_SIZE);
      let sent = 0;
      let failed = 0;

      for (const batch of chunks) {
        const messages = batch.map(token => ({
          to: token,
          title,
          body,
          data,
          sound: 'default',
        }));

        const res = await fetch(EXPO_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(messages),
        });

        const json = await res.json();
        const results = json.data ?? [];
        results.forEach(r => {
          if (r.status === 'ok') sent++;
          else failed++;
        });
      }

      // Intentar loguear (ignorar si la tabla no existe)
      try {
        await supabase.from('notification_logs').insert({
          title,
          body,
          sent_count: sent,
          failed_count: failed,
          sent_at: new Date().toISOString(),
        });
      } catch (_) {
        // tabla no existe aún — no es crítico
      }

      const outcome = { sent, failed };
      setResult(outcome);
      return outcome;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      return null;
    } finally {
      setSending(false);
    }
  };

  const getTokenCount = async () => {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .not('push_token', 'is', null);
    return count ?? 0;
  };

  return { sending, result, error, sendToAll, getTokenCount };
}
