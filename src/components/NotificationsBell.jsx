import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Wallet, AlertTriangle, Scale, MessageSquare, CheckCheck } from 'lucide-react';
import { useAdminNotifications } from '../hooks/useAdminNotifications';
import { relTime } from '../lib/activity';

// Ícono y color por tipo de aviso (los mismos que genera notify_admins en la base).
const STYLE = {
  withdrawal:      { icon: Wallet,        cls: 'bg-amber-50 text-amber-600' },
  deposit:         { icon: Wallet,        cls: 'bg-emerald-50 text-emerald-600' },
  report:          { icon: AlertTriangle, cls: 'bg-red-50 text-red-500' },
  dispute:         { icon: Scale,         cls: 'bg-purple-50 text-purple-600' },
  dispute_message: { icon: MessageSquare, cls: 'bg-purple-50 text-purple-600' },
};
const FALLBACK = { icon: Bell, cls: 'bg-slate-100 text-slate-500' };

export default function NotificationsBell({ userId }) {
  const { items, unreadCount, loading, markRead, markAllRead, markingAll } =
    useAdminNotifications(userId);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  // Cerrar al hacer click afuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleOpen = (n) => {
    if (!n.read_at) markRead(n.id);
    setOpen(false);
    const url = n.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) navigate(url);
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `Avisos (${unreadCount} sin leer)` : 'Avisos'}
        aria-expanded={open}
        className="relative p-3 bg-white rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl z-40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Avisos</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-40"
              >
                <CheckCheck size={14} />
                Marcar todo leído
              </button>
            )}
          </div>

          <div className="max-h-[70vh] sm:max-h-96 overflow-y-auto">
            {loading && <p className="px-4 py-8 text-center text-sm text-slate-400">Cargando…</p>}

            {!loading && items.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Bell size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No hay avisos todavía</p>
              </div>
            )}

            {items.map((n) => {
              const { icon: Icon, cls } = STYLE[n.type] ?? FALLBACK;
              return (
                <button
                  key={n.id}
                  onClick={() => handleOpen(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-slate-50 last:border-0 hover:bg-slate-50 transition ${
                    n.read_at ? '' : 'bg-primary-50/40'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cls}`}>
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{relTime(n.created_at)}</p>
                  </div>
                  {!n.read_at && (
                    <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
