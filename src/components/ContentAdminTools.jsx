import React, { useState } from 'react';
import { Eye, Smartphone, Globe, CalendarClock, X, PauseCircle, PlayCircle, Info } from 'lucide-react';
import { useContentViews, useSetPaused } from '../hooks/useAdminActions';

const fmtDate = (d) => (d ? new Date(d).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

// Vistas de una chamba o empleo. Se cuentan aperturas del detalle (app + web).
// No se muestran "personas distintas": la app no manda el usuario en estos
// eventos (view_job nunca, view_chamba casi nunca), así que el número sería falso.
export function ViewsPanel({ entityType, entityId }) {
  const { data, isLoading, error } = useContentViews(entityType, entityId);

  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex items-center gap-1.5 text-slate-400 mb-3">
        <Eye size={14} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Vistas</span>
      </div>
      {isLoading ? (
        <div className="h-14 bg-slate-50 rounded-lg animate-pulse" />
      ) : error ? (
        <p className="text-sm text-red-500">No se pudieron cargar las vistas.</p>
      ) : (
        <>
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <p className="text-3xl font-black text-slate-800 leading-none">{Number(data?.views ?? 0).toLocaleString('es-BO')}</p>
              <p className="text-[11px] text-slate-400 mt-1">veces abierta</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Stat icon={<Smartphone size={12} />} label="App" value={data?.views_app} />
              <Stat icon={<Globe size={12} />} label="Web" value={data?.views_site} />
              <Stat icon={<CalendarClock size={12} />} label="Últimos 7 días" value={data?.views_7d} />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">Última vista: {fmtDate(data?.last_view)}</p>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
      <span className="text-slate-400">{icon}</span>
      {label}: <b className="text-slate-800">{Number(value ?? 0).toLocaleString('es-BO')}</b>
    </span>
  );
}

// Confirmación de pausar / reanudar. Pausar la saca de los listados de la app y
// la web sin borrarla; reanudar la devuelve tal como estaba.
export function PauseModal({ entityType, entityId, title, paused, hasOwner, onClose, onDone }) {
  const [message, setMessage] = useState('');
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState('');
  const setPaused = useSetPaused();
  const pausing = !paused;
  const noun = entityType === 'job' ? 'el empleo' : 'la chamba';

  const confirm = async () => {
    setError('');
    try {
      await setPaused.mutateAsync({ entityType, entityId, paused: pausing, message, notify: hasOwner && notify });
      onDone?.(pausing ? 'Publicación pausada' : 'Publicación reanudada');
      onClose();
    } catch (e) {
      setError(e.message || 'No se pudo completar.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-slate-100 gap-3">
          <div className="min-w-0">
            <h2 className="font-bold text-slate-800 text-lg">{pausing ? `Pausar ${noun}` : `Reanudar ${noun}`}</h2>
            {title && <p className="text-xs text-slate-400 mt-0.5 truncate">«{title}»</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all shrink-0">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex gap-2 bg-slate-50 rounded-xl p-3">
            <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              {pausing
                ? 'Deja de aparecer en los listados de la app y la web, pero no se borra: podés reanudarla cuando quieras y vuelve tal cual. Si tiene pago en custodia, el dinero sigue retenido.'
                : 'Vuelve a aparecer en los listados con el mismo estado que tenía antes de pausarla.'}
            </p>
          </div>
          {hasOwner ? (
            <>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-primary-600" />
                Avisarle al dueño
              </label>
              {notify && (
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={pausing ? 'Motivo (opcional). Si lo dejás vacío: «… quedó en pausa: por ahora no aparece en los listados.»' : 'Mensaje (opcional)'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400">Aviso del scraper: no tiene dueño al que avisarle.</p>
          )}
          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
        </div>
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} disabled={setPaused.isPending} className="flex-1 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={confirm} disabled={setPaused.isPending}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 ${pausing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'}`}>
            {pausing ? <PauseCircle size={17} /> : <PlayCircle size={17} />}
            {setPaused.isPending ? 'Guardando…' : pausing ? 'Pausar' : 'Reanudar'}
          </button>
        </div>
      </div>
    </div>
  );
}
