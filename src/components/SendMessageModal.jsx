import React, { useState } from 'react';
import { X, Send, Smartphone } from 'lucide-react';
import { useMessageUser } from '../hooks/useAdminActions';
import EmailNotifyToggle from './EmailNotifyToggle';

// Mensaje del equipo al usuario: le llega a la bandeja de notificaciones de la
// app y como push. Si es sobre una chamba/empleo, al tocarlo abre esa
// publicación. El destinatario lo resuelve el servidor.
//
// `entityType`: user | chamba | job · `entityId`: id de esa entidad.
// `userId`: el destinatario (para saber si tiene push y ofrecer el correo).
export default function SendMessageModal({ entityType, entityId, userId, targetName, contentTitle, onClose, onSent }) {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(false);
  const [error, setError] = useState('');
  const send = useMessageUser();
  const onContent = entityType === 'chamba' || entityType === 'job';

  const handleSend = async () => {
    setError('');
    if (!message.trim()) { setError('Escribí un mensaje.'); return; }
    try {
      const res = await send.mutateAsync({ entityType, entityId, message: message.trim(), email });
      onSent?.(`Mensaje enviado${targetName ? ` a ${targetName}` : ''}${res?.emailed ? ' y por correo' : ''} · lo ves en Mensajes`);
      onClose();
    } catch (e) {
      setError(e.message || 'No se pudo enviar.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-slate-100 gap-3">
          <div className="min-w-0">
            <h2 className="font-bold text-slate-800 text-lg">Enviar mensaje{targetName ? ` a ${targetName}` : ''}</h2>
            {onContent && contentTitle && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">Sobre «{contentTitle}»</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex gap-2 bg-slate-50 rounded-xl p-3">
            <Smartphone size={16} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Le llega como <b>chat de «Equipo Conecta2»</b> en la app (con aviso push si lo tiene activado).
              Te puede contestar ahí mismo y lo ves en <b>Mensajes</b>.{onContent ? ' El mensaje arranca con «Sobre …» para que sepa de qué publicación hablás.' : ''}
            </p>
          </div>
          <textarea
            autoFocus
            rows={5}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribí el mensaje…"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <EmailNotifyToggle userId={userId} checked={email} onChange={setEmail} />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span className="text-red-500 font-semibold">{error}</span>
            <span>{message.length}/500</span>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} disabled={send.isPending} className="flex-1 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSend} disabled={send.isPending} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-dark text-white hover:bg-slate-800 transition-all disabled:opacity-50">
            <Send size={16} /> {send.isPending ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  );
}
