import React, { useState } from 'react';
import { Bell, Send, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import PushOptIn from './PushOptIn';
import ConfirmModal from './ConfirmModal';

// Dos cosas distintas conviven acá:
//   1. Los avisos que RECIBE el equipo en este navegador (PushOptIn).
//   2. El broadcast que el equipo ENVÍA a todos los usuarios de la app.
//
// Antes había además un bloque de "Preferencias de Alertas" y un email de
// administrador que se guardaban en localStorage y no los leía nadie: prometían
// un control que no existía. Ahora los eventos que disparan avisos están
// definidos en la base (triggers de notify_admins), así que se sacaron.
export default function AlertsConfig({ userId }) {
  const { sending, result, error: sendError, sendToAll, getTokenCount } = useNotifications();
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tokenCount, setTokenCount] = useState(null);

  const handleOpenConfirm = async () => {
    const count = await getTokenCount();
    setTokenCount(count);
    setConfirmOpen(true);
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    await sendToAll(pushTitle, pushBody);
  };

  const canSend = pushTitle.trim() && pushBody.trim() && !sending;

  return (
    <div className="space-y-6">
      {/* ── Avisos que recibe el equipo ── */}
      <PushOptIn userId={userId} />

      {/* ── Push Broadcast ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Bell size={18} className="text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">Notificación a todos los usuarios</h3>
            <p className="text-xs text-slate-400 mt-0.5">Envía un push notification a cada usuario con la app instalada</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Título *</label>
            <input
              type="text"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              maxLength={60}
              placeholder="Ej: ¡Nueva oferta disponible!"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mensaje *</label>
            <textarea
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Ej: Hay nuevas chambas cerca de ti. ¡Entra a ver!"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        {/* Preview */}
        {(pushTitle || pushBody) && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Vista previa</p>
            <div className="bg-slate-800 rounded-2xl p-4 max-w-sm mx-auto shadow-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shrink-0">
                  <Bell size={14} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Conecta2</span>
                    <span className="text-[10px] text-slate-500">ahora</span>
                  </div>
                  <p className="text-sm font-semibold text-white leading-snug">
                    {pushTitle || 'Título de la notificación'}
                  </p>
                  {pushBody && (
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed line-clamp-2">{pushBody}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resultado anterior */}
        {result && (
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <span className="flex items-center gap-1.5 text-sm font-bold text-green-600">
              <CheckCircle size={16} /> {result.sent} enviadas
            </span>
            {result.failed > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-bold text-red-500">
                <XCircle size={16} /> {result.failed} fallidas
              </span>
            )}
            {result.cleaned > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-500">
                <Trash2 size={16} /> {result.cleaned} inactivos limpiados
              </span>
            )}
          </div>
        )}

        {sendError && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{sendError}</p>
        )}

        <button
          onClick={handleOpenConfirm}
          disabled={!canSend}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-primary-600 text-white hover:bg-primary-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</>
          ) : (
            <><Send size={16} /> Enviar a todos los usuarios</>
          )}
        </button>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSend}
        loading={sending}
        title="Enviar notificación"
        message={`Se enviará la notificación a ${tokenCount ?? '…'} usuarios con la app instalada. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, enviar"
        confirmClass="bg-primary-600 hover:bg-primary-700 text-white"
      />
    </div>
  );
}
