import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// Diálogo de confirmación para una acción de moderación: explica qué va a pasar,
// deja escribir un mensaje para el usuario y elegir si se le notifica.
//
// `action`: warn | remove_content | ban | unban | dismiss (este último solo al
// resolver un reporte). `entityType`: user | chamba | job | alert.

// Textos que usa el servidor cuando el mensaje va vacío (ver _moderation_apply).
const defaultMessage = (action, contentTitle) => ({
  warn: 'Recibiste una advertencia. Revisá las normas de la comunidad para evitar una suspensión.',
  remove_content: `«${contentTitle || 'Tu publicación'}» fue removida por incumplir las normas de la comunidad.`,
  ban: 'Tu cuenta fue suspendida por incumplir las normas de la comunidad.',
  unban: 'Ya podés volver a publicar y postular en Conecta2.',
}[action] || '');

const RED = 'bg-red-500 hover:bg-red-600 text-white';

function buildConfig({ action, entityType, targetName, contentTitle }) {
  const onContent = entityType && entityType !== 'user';
  const who = targetName || (onContent ? 'el dueño del aviso' : 'el usuario');
  const quoted = contentTitle ? `«${contentTitle}»` : 'El contenido';

  switch (action) {
    case 'warn':
      return {
        title: `Advertir a ${who}`,
        text: 'Se le envía una advertencia y queda registrada en el historial de la cuenta. No se suspende la cuenta ni se oculta ningún aviso.',
        confirmLabel: 'Advertir',
        confirmClass: 'bg-amber-500 hover:bg-amber-600 text-white',
      };
    case 'remove_content':
      return {
        title: entityType === 'alert' ? 'Eliminar alerta' : 'Eliminar aviso',
        text: entityType === 'alert'
          ? `${quoted} se borra definitivamente. No se puede deshacer.`
          : `${quoted} deja de mostrarse en la app y en la web, y su dueño no puede reactivarlo.${entityType === 'chamba' ? ' Si tenía un pago en custodia sin trabajador elegido, se le devuelve.' : ''}`,
        confirmLabel: 'Eliminar',
        confirmClass: RED,
      };
    case 'ban':
      return {
        title: `Suspender a ${who}`,
        text: 'La cuenta queda suspendida: no puede publicar ni postular, y sus avisos vigentes se ocultan. Podés reactivarla cuando quieras.',
        confirmLabel: 'Suspender',
        confirmClass: RED,
      };
    case 'unban':
      return {
        title: `Reactivar a ${who}`,
        text: 'La cuenta vuelve a poder publicar y postular, y se restauran los avisos que se habían ocultado por la suspensión.',
        confirmLabel: 'Reactivar',
        confirmClass: 'bg-green-500 hover:bg-green-600 text-white',
      };
    case 'dismiss':
      return {
        title: 'Descartar reporte',
        text: 'El reporte se marca como descartado. No se toma ninguna acción sobre el contenido ni sobre la cuenta.',
        confirmLabel: 'Descartar',
        confirmClass: 'bg-slate-700 hover:bg-slate-800 text-white',
      };
    default:
      return { title: 'Confirmar', text: '', confirmLabel: 'Confirmar', confirmClass: RED };
  }
}

export default function ModerationActionModal({ isOpen, ...props }) {
  if (!isOpen) return null;
  // Se monta de nuevo en cada apertura: el mensaje y la casilla arrancan limpios.
  return <ModerationActionDialog {...props} />;
}

function ModerationActionDialog({
  action, entityType, targetName, contentTitle,
  onClose, onConfirm, loading = false, error = null,
  note = null,          // aclaración extra bajo el texto (p. ej. cuántos reportes se cierran)
  warning = null,       // advertencia destacada antes de confirmar
  notifyLabel = null,   // reemplaza la etiqueta de la casilla
}) {
  const [message, setMessage] = useState('');
  const [notify, setNotify] = useState(true);

  const cfg = buildConfig({ action, entityType, targetName, contentTitle });
  // Descartar no le escribe a nadie más que a quien reportó: no hay mensaje.
  const hasMessage = action !== 'dismiss';

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 max-h-[92vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-800 text-lg leading-tight">{cfg.title}</h3>
              <p className="text-slate-500 text-sm mt-1 leading-relaxed">{cfg.text}</p>
              {note && <p className="text-slate-500 text-sm mt-2 leading-relaxed font-semibold">{note}</p>}
            </div>
            <button onClick={onClose} disabled={loading} aria-label="Cerrar" className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 -mt-1 disabled:opacity-50">
              <X size={20} />
            </button>
          </div>

          {warning && (
            <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 leading-relaxed font-semibold">
              {warning}
            </p>
          )}

          {hasMessage && (
            <label className="block mt-5">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Mensaje para el usuario (opcional)
              </span>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
                placeholder={defaultMessage(action, contentTitle)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              />
              <span className="block text-xs text-slate-400 mt-1">
                Si lo dejás vacío se usa el texto por defecto (el que se ve en gris). Queda guardado en el historial de la cuenta.
              </span>
            </label>
          )}

          <label className="flex items-center gap-2.5 mt-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 rounded border-slate-300 accent-primary-500"
            />
            <span className="text-sm font-semibold text-slate-700">
              {notifyLabel || (action === 'dismiss' ? 'Avisar a quien reportó' : 'Notificar al usuario')}
            </span>
          </label>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 leading-relaxed">
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm({ message: hasMessage ? message.trim() : '', notify })}
              disabled={loading}
              className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 ${cfg.confirmClass}`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </span>
              ) : cfg.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
