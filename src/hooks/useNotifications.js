import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Proxy serverless propio (api/expo.js): el navegador no puede llamar a Expo directo por
// falta de CORS. El proxy corre en el servidor (mismo origen) y reenvía a Expo.
const EXPO_SEND_URL = '/api/expo?action=send';
const EXPO_RECEIPTS_URL = '/api/expo?action=receipts';
const CHUNK_SIZE = 100; // límite de mensajes por request de Expo

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Destinatarios notificables: con token, NO baneados y NO eliminados.
// `not('is_banned','is',true)` incluye is_banned = false y NULL (equivale a
// COALESCE(is_banned,false)=false, igual que las RPCs del scraper).
function applyNotifiableFilters(query) {
  return query
    .not('push_token', 'is', null)
    .not('is_banned', 'is', true)
    .is('deleted_at', null);
}

export function useNotifications() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null); // { sent, failed, cleaned }
  const [error, setError] = useState(null);

  const sendToAll = async (title, body, data = {}) => {
    setSending(true);
    setResult(null);
    setError(null);

    try {
      const { data: users, error: dbError } = await applyNotifiableFilters(
        supabase.from('users').select('id, push_token'),
      );
      if (dbError) throw new Error(dbError.message);

      const recipients = (users ?? []).filter((u) => u.push_token);
      if (recipients.length === 0) {
        const empty = { sent: 0, failed: 0, cleaned: 0 };
        setResult(empty);
        return empty;
      }

      let sent = 0;
      let failed = 0;
      const deadUserIds = new Set(); // tokens muertos → limpiar push_token
      const receiptMap = new Map(); // ticketId -> userId (para getReceipts)

      for (const batch of chunk(recipients, CHUNK_SIZE)) {
        const messages = batch.map((u) => ({
          to: u.push_token,
          title,
          body,
          data,
          sound: 'default',
        }));

        let json;
        try {
          const res = await fetch(EXPO_SEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(messages),
          });
          // Si el lote entero falla (rate-limit 429, error de red/servidor), todos
          // sus destinatarios cuentan como fallidos en vez de perderse en silencio.
          if (!res.ok) {
            failed += batch.length;
            continue;
          }
          json = await res.json();
        } catch {
          failed += batch.length;
          continue;
        }

        const tickets = json?.data ?? [];
        batch.forEach((u, i) => {
          const ticket = tickets[i];
          if (ticket?.status === 'ok') {
            sent++;
            if (ticket.id) receiptMap.set(ticket.id, u.id);
          } else {
            failed++;
            // Token inválido detectado ya en el envío → marcar para limpiar.
            if (ticket?.details?.error === 'DeviceNotRegistered') deadUserIds.add(u.id);
          }
        });
      }

      // Receipts: Expo confirma la entrega real de forma diferida. Esperamos un poco y
      // consultamos para detectar tokens muertos (DeviceNotRegistered) que el envío
      // aceptó pero no se entregaron. Best-effort: lo que no esté listo se limpiará en
      // un próximo envío; si esta consulta falla, no afecta el resultado del envío.
      const ticketIds = [...receiptMap.keys()];
      if (ticketIds.length > 0) {
        try {
          await sleep(4000);
          for (const ids of chunk(ticketIds, 1000)) {
            const res = await fetch(EXPO_RECEIPTS_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ ids }),
            });
            if (!res.ok) continue;
            const json = await res.json();
            const receipts = json?.data ?? {};
            for (const [ticketId, receipt] of Object.entries(receipts)) {
              if (receipt?.status === 'error' && receipt?.details?.error === 'DeviceNotRegistered') {
                const userId = receiptMap.get(ticketId);
                if (userId) deadUserIds.add(userId);
              }
            }
          }
        } catch {
          /* receipts best-effort */
        }
      }

      // Limpiar tokens muertos (app desinstalada / token revocado): liberan ruido en
      // próximos envíos y dejan de contar como "fallidos".
      let cleaned = 0;
      if (deadUserIds.size > 0) {
        const ids = [...deadUserIds];
        const { error: cleanErr } = await supabase
          .from('users')
          .update({ push_token: null })
          .in('id', ids);
        if (!cleanErr) cleaned = ids.length;
      }

      // Registrar el broadcast con el esquema real de notification_logs (data es JSONB).
      // user_id queda null porque es un envío masivo, no a un usuario puntual.
      const { error: logErr } = await supabase.from('notification_logs').insert({
        title,
        body,
        data: { audience: 'broadcast', recipients: recipients.length, sent, failed, cleaned },
        status: failed === 0 ? 'sent' : 'partial',
      });
      if (logErr) console.warn('notification_logs insert falló:', logErr.message);

      const outcome = { sent, failed, cleaned };
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
    const { count } = await applyNotifiableFilters(
      supabase.from('users').select('id', { count: 'exact', head: true }),
    );
    return count ?? 0;
  };

  return { sending, result, error, sendToAll, getTokenCount };
}
