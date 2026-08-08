/**
 * Entrega de Web Push al panel admin.
 *
 * La llama la base de datos (`notify_admins` por pg_net), nunca el navegador:
 * por eso se autentica con un secreto compartido y no con una sesión.
 *
 * La base manda las suscripciones ya resueltas en el body, así que esta ruta no
 * necesita credenciales de servicio para leer la tabla: solo firma, cifra y
 * entrega. Lo único que escribe de vuelta es el borrado de las que el push
 * service declara muertas, vía el mismo RPC que usa la web pública.
 *
 * Es gemela de web-index/src/app/api/push/send/route.ts, con dos diferencias:
 * comparte las claves VAPID y el secreto (no hay nada nuevo que rotar), pero la
 * URL de destino viene explícita en `data.url` — acá no existe el mapeo de
 * pantallas del móvil, los triggers ya saben a qué vista del panel apuntan.
 *
 *   POST /api/push/send   headers: x-push-secret
 *                         body:    { title, body, data, subs: [{endpoint,p256dh,auth}] }
 */
import webpush from 'web-push';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const PUSH_SECRET = process.env.PUSH_SEND_SECRET || '';
// `mailto:` es parte del estándar VAPID: identifica a quién contactar si un
// push service detecta abuso.
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:oscarmijaelpg@gmail.com';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, reason: 'method_not_allowed' });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !PUSH_SECRET) {
    // Sin claves no se puede enviar. Se responde 200 a propósito: esto lo llama
    // la base, y un error acá no debe hacer ruido en un flujo de dinero que ya
    // se completó.
    return res.status(200).json({ ok: false, reason: 'not_configured' });
  }

  if (req.headers['x-push-secret'] !== PUSH_SECRET) {
    return res.status(401).json({ ok: false, reason: 'forbidden' });
  }

  let payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ ok: false, reason: 'bad_json' });
  }

  const subs = Array.isArray(payload.subs) ? payload.subs : [];
  if (subs.length === 0) return res.status(200).json({ ok: true, sent: 0 });

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

  const data = payload.data ?? {};
  const message = JSON.stringify({
    title: payload.title || 'Conecta2 Admin',
    body: payload.body || '',
    // Agrupa por disputa / transacción / reporte: diez mensajes de la misma
    // disputa reemplazan el aviso anterior en vez de apilar diez notificaciones.
    tag: typeof data.tag === 'string' ? data.tag : undefined,
    data: { ...data, url: typeof data.url === 'string' ? data.url : '/dashboard' },
  });

  let sent = 0;
  const dead = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          message,
          { TTL: 60 * 60 * 24 }, // si el device está apagado un día, ya no sirve
        );
        sent += 1;
      } catch (err) {
        // 404/410 = la suscripción ya no existe (navegador limpiado, permiso
        // revocado). Se borra para no seguir intentando por siempre.
        const status = err?.statusCode;
        if (status === 404 || status === 410) dead.push(s.endpoint);
      }
    }),
  );

  if (dead.length > 0) await pruneDead(dead);

  return res.status(200).json({ ok: true, sent, pruned: dead.length });
}

// `web_push_prune` valida el secreto adentro, por eso alcanza con la anon key.
async function pruneDead(endpoints) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return;
  await Promise.all(
    endpoints.map((endpoint) =>
      fetch(`${SUPABASE_URL}/rest/v1/rpc/web_push_prune`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({ p_endpoint: endpoint, p_secret: PUSH_SECRET }),
      }).catch(() => undefined),
    ),
  );
}
