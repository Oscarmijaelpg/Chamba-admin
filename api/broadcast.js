/**
 * Broadcast de push notifications — orquestación 100% en el servidor.
 *
 * Antes el navegador bajaba todos los push_token, troceaba, enviaba a Expo (vía el
 * proxy /api/expo), consultaba receipts y limpiaba tokens muertos. Ahora todo eso
 * ocurre aquí, en el servidor. El cliente solo manda { title, body } + su JWT.
 *
 * No requiere service-role key: usa el JWT del admin que llama y RPCs SECURITY
 * DEFINER gateadas por is_admin() (admin_notifiable_tokens / admin_clear_push_tokens).
 *
 *   POST /api/broadcast   headers: Authorization: Bearer <supabase access token>
 *                         body:    { title, body, data? }
 */
import { createClient } from '@supabase/supabase-js';

const EXPO_BASE = 'https://exp.host/--/api/v2/push';
const CHUNK_SIZE = 100;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function expo(action, payload) {
  const res = await fetch(`${EXPO_BASE}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  return res;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return res.status(500).json({ error: 'Faltan variables de entorno de Supabase en el servidor' });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Falta el token de sesión' });

  const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { title, body, data = {} } = payload;
  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({ error: 'Título y mensaje son obligatorios' });
  }

  // Cliente con el JWT del admin → las RPCs SECURITY DEFINER validan is_admin().
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: recipients, error: recErr } = await supabase.rpc('admin_notifiable_tokens');
  if (recErr) return res.status(403).json({ error: recErr.message });
  if (!recipients || recipients.length === 0) {
    return res.status(200).json({ sent: 0, failed: 0, cleaned: 0 });
  }

  let sent = 0;
  let failed = 0;
  const deadIds = new Set();
  const receiptMap = new Map(); // ticketId -> userId

  for (const batch of chunk(recipients, CHUNK_SIZE)) {
    const messages = batch.map((u) => ({ to: u.push_token, title, body, data, sound: 'default' }));
    let json;
    try {
      const r = await expo('send', messages);
      if (!r.ok) { failed += batch.length; continue; }
      json = await r.json();
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
        if (ticket?.details?.error === 'DeviceNotRegistered') deadIds.add(u.id);
      }
    });
  }

  // Receipts (best-effort): detecta tokens muertos que el envío aceptó pero no se entregaron.
  const ticketIds = [...receiptMap.keys()];
  if (ticketIds.length > 0) {
    try {
      await sleep(3000);
      for (const ids of chunk(ticketIds, 1000)) {
        const r = await expo('getReceipts', { ids });
        if (!r.ok) continue;
        const json = await r.json();
        const receipts = json?.data ?? {};
        for (const [ticketId, receipt] of Object.entries(receipts)) {
          if (receipt?.status === 'error' && receipt?.details?.error === 'DeviceNotRegistered') {
            const userId = receiptMap.get(ticketId);
            if (userId) deadIds.add(userId);
          }
        }
      }
    } catch {
      /* best-effort */
    }
  }

  let cleaned = 0;
  if (deadIds.size > 0) {
    const ids = [...deadIds];
    const { data: n, error: clErr } = await supabase.rpc('admin_clear_push_tokens', { p_ids: ids });
    if (!clErr) cleaned = n ?? ids.length;
  }

  // Log del broadcast (la política notification_logs_admin_insert lo permite).
  await supabase.from('notification_logs').insert({
    title,
    body,
    data: { audience: 'broadcast', recipients: recipients.length, sent, failed, cleaned },
    status: failed === 0 ? 'sent' : 'partial',
  });

  return res.status(200).json({ sent, failed, cleaned });
}
