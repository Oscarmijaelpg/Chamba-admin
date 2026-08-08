// Suscripción del navegador a Web Push, para el panel admin.
//
// Port del módulo equivalente de la web pública (web-index/src/lib/webPush.ts),
// sin tipos. Diferencia clave: acá la suscripción se marca con `origin: 'admin'`,
// así `notify_admins()` le manda solo a los navegadores registrados desde el
// panel y no ensucia la PWA pública ni la app móvil del administrador.
//
// Sobre iOS: Safari soporta Web Push desde la 16.4, pero SOLO cuando la web está
// agregada a la pantalla de inicio. Desde una pestaña normal `PushManager`
// directamente no existe, así que no alcanza con pedir permiso: hay que detectar
// el caso y explicarlo. Por eso `pushSupport()` distingue "no se puede" de "hay
// que instalar".

import { supabase } from './supabase';

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  // `standalone` es la propiedad no estándar de Safari iOS; el media query
  // cubre al resto.
  const iosStandalone = window.navigator.standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

export function isIos() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS se hace pasar por Mac; se lo reconoce porque es táctil.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

// 'ready' | 'needs-install' | 'unsupported'
export function pushSupport() {
  if (typeof window === 'undefined') return 'unsupported';
  const hasApi =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (hasApi) return 'ready';
  // En iOS la API aparece recién cuando corre como app instalada.
  if (isIos() && !isStandalone()) return 'needs-install';
  return 'unsupported';
}

export function permissionState() {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  return Notification.permission;
}

// La clave VAPID viaja en base64url y el navegador la quiere como bytes.
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

// Pide permiso y registra la suscripción. DEBE llamarse desde un gesto del
// usuario (un click): iOS ignora `requestPermission` si no viene de uno.
// Devuelve { ok: true } | { ok: false, reason: 'denied'|'unsupported'|'no-key'|'error' }
export async function subscribeToPush(userId) {
  if (pushSupport() !== 'ready') return { ok: false, reason: 'unsupported' };

  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapid) return { ok: false, reason: 'no-key' };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'denied' };

    const reg = await navigator.serviceWorker.ready;
    // Si ya había una suscripción de este navegador se reutiliza: cambiarla
    // rompería la que el servidor ya tiene guardada.
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true, // obligatorio: nada de push silencioso
        applicationServerKey: urlBase64ToUint8Array(vapid),
      }));

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, reason: 'error' };
    }

    // upsert por endpoint: si el mismo navegador vuelve a suscribirse, se
    // actualiza en vez de duplicar.
    const { error } = await supabase.from('web_push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent.slice(0, 300),
        origin: 'admin',
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );
    if (error) {
      console.error('[webPush] guardar suscripción:', error.message);
      return { ok: false, reason: 'error' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[webPush] subscribe:', err);
    return { ok: false, reason: 'error' };
  }
}

export async function unsubscribeFromPush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const endpoint = sub.endpoint;
    await sub.unsubscribe();
    await supabase.from('web_push_subscriptions').delete().eq('endpoint', endpoint);
  } catch (err) {
    console.error('[webPush] unsubscribe:', err);
  }
}

// ¿Este navegador ya está suscrito? Se consulta al service worker, no a la base:
// lo que importa es el estado real del dispositivo que se tiene enfrente.
export async function hasActiveSubscription() {
  try {
    if (pushSupport() !== 'ready') return false;
    const reg = await navigator.serviceWorker.ready;
    return (await reg.pushManager.getSubscription()) !== null;
  } catch {
    return false;
  }
}
