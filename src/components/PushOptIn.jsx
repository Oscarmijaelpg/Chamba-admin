import React, { useState, useEffect } from 'react';
import { BellRing, BellOff, Share, Loader2 } from 'lucide-react';
import {
  pushSupport,
  permissionState,
  subscribeToPush,
  unsubscribeFromPush,
  hasActiveSubscription,
} from '../lib/webPush';

/**
 * Activar/desactivar los avisos del navegador para ESTE dispositivo.
 *
 * El estado se consulta al service worker, no a la base: lo que importa es el
 * navegador que se tiene enfrente, no si el admin se suscribió alguna vez desde
 * otra máquina.
 */
export default function PushOptIn({ userId }) {
  const [support, setSupport] = useState('unsupported');
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = pushSupport();
      const on = await hasActiveSubscription();
      if (!alive) return;
      setSupport(s);
      setActive(on);
      setBusy(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // `requestPermission` tiene que salir de un click: iOS lo ignora si no.
  const handleToggle = async () => {
    setError('');
    setBusy(true);
    if (active) {
      await unsubscribeFromPush();
      setActive(false);
      setBusy(false);
      return;
    }
    const res = await subscribeToPush(userId);
    if (res.ok) {
      setActive(true);
    } else {
      setError(
        {
          denied:
            'Bloqueaste las notificaciones para este sitio. Hay que habilitarlas desde los ajustes del navegador.',
          'no-key': 'Faltan las claves de push en el servidor (VITE_VAPID_PUBLIC_KEY).',
          unsupported: 'Este navegador no soporta avisos.',
        }[res.reason] ?? 'No se pudo activar. Intentá de nuevo.'
      );
    }
    setBusy(false);
  };

  const denied = permissionState() === 'denied';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
          <BellRing size={18} className="text-primary-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800 leading-tight">Avisos en este dispositivo</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Retiros y recargas por aprobar, reportes, disputas y sus mensajes
          </p>
        </div>
      </div>

      {support === 'needs-install' ? (
        // iOS en pestaña: PushManager ni siquiera existe. Mostrar un botón que no
        // puede funcionar sería mentir.
        <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
          <Share size={18} className="text-slate-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600 leading-relaxed">
            En iPhone y iPad los avisos funcionan solo con el panel agregado a la pantalla de
            inicio. Tocá <span className="font-semibold">Compartir</span> y después{' '}
            <span className="font-semibold">Agregar a inicio</span>, y volvé a entrar desde ahí.
          </p>
        </div>
      ) : support === 'unsupported' ? (
        <p className="text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
          Este navegador no soporta avisos del sistema.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              {active ? (
                <BellRing size={20} className="text-primary-600" />
              ) : (
                <BellOff size={20} className="text-slate-400" />
              )}
              <span className="font-medium text-slate-800">
                {active ? 'Avisos activados' : 'Avisos desactivados'}
              </span>
            </div>
            <button
              role="switch"
              aria-checked={active}
              aria-label="Avisos en este dispositivo"
              disabled={busy || denied}
              onClick={handleToggle}
              className={`w-12 h-6 rounded-full transition disabled:opacity-40 ${
                active ? 'bg-primary-600' : 'bg-slate-300'
              }`}
            >
              {busy ? (
                <Loader2 size={14} className="mx-auto text-white animate-spin" />
              ) : (
                <div
                  className={`w-5 h-5 rounded-full bg-white transition transform ${
                    active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              )}
            </button>
          </div>

          {denied && !active && (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
              Las notificaciones están bloqueadas para este sitio. Habilitalas desde el candado de
              la barra de direcciones y recargá la página.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
          )}
        </>
      )}
    </div>
  );
}
