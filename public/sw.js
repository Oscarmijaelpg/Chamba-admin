/* Service worker del panel admin.
 *
 * Existe SOLO para recibir push. A propósito no tiene handler `fetch` ni caché:
 * un panel de administración que sirve JS viejo muestra plata y estados
 * desactualizados, y eso es peor que tardar medio segundo más en cargar. El
 * caché lo maneja Vercel con los headers de `vercel.json`.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Borra cachés de versiones anteriores por si alguna vez se agregó una.
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Conecta2 Admin', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Conecta2 Admin';
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // Agrupa por disputa / transacción / reporte: diez mensajes de la misma
    // disputa reemplazan el aviso anterior en vez de apilar diez iguales.
    tag: payload.tag || undefined,
    data: payload.data || {},
    vibrate: [80, 40, 80],
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // Si el panel está abierto, que la campana se entere sin esperar al
      // siguiente refetch.
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) client.postMessage({ type: 'admin-notification' });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  const target = new URL(url || '/dashboard', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Si el panel ya está abierto, se reutiliza esa ventana en vez de abrir otra.
      for (const client of all) {
        if (client.url.startsWith(self.location.origin)) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(target);
            } catch {
              /* algunos navegadores no lo permiten */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
