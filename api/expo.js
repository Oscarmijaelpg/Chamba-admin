/**
 * Proxy serverless a la Expo Push API.
 *
 * El navegador NO puede llamar a https://exp.host/--/api/v2/push/* directamente porque
 * Expo no devuelve headers CORS (el fetch se bloquea). Esta función corre en el servidor
 * de Vercel (mismo origen que el admin → sin CORS) y reenvía la petición a Expo.
 *
 * Llamadas:
 *   POST /api/expo?action=send       body = [ { to, title, body, ... }, ... ]
 *   POST /api/expo?action=receipts   body = { ids: [ ... ] }
 */
const EXPO_BASE = 'https://exp.host/--/api/v2/push';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const action = req.query?.action === 'receipts' ? 'getReceipts' : 'send';
  const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

  try {
    const upstream = await fetch(`${EXPO_BASE}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: payload,
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text); // se pasa tal cual la respuesta de Expo (tickets / receipts)
  } catch (err) {
    res.status(502).json({ error: `expo proxy failed: ${String(err)}` });
  }
}
