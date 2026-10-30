import React, { useState } from 'react';
import { X, Check, AlertTriangle, Paperclip } from 'lucide-react';
import { useApproveDeposit } from '../hooks/useAdminActions';

const money = (n) => `Bs. ${Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// Aprobar una recarga: el monto viene precargado con lo que pidió el usuario,
// pero el admin confirma el que realmente llegó (mirando el comprobante). Eso
// es lo que se acredita.
export default function ApproveDepositModal({ tx, onClose, onToast }) {
  const approve = useApproveDeposit();
  const loading = approve.isPending;
  const requested = Number(tx.amount ?? 0);
  const [amount, setAmount] = useState(String(requested));
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const value = Number(String(amount).replace(',', '.'));
  const valid = Number.isFinite(value) && value > 0;
  const differs = valid && Math.round(value * 100) !== Math.round(requested * 100);

  const submit = async () => {
    setError('');
    if (!valid) { setError('Ingresá un monto mayor a 0.'); return; }
    try {
      await approve.mutateAsync({ id: tx.id, amount: value, note: note.trim() });
      onToast('ok', `Recarga aprobada: ${money(value)} a ${tx.users?.full_name || 'el usuario'}`);
      onClose();
    } catch (e) {
      setError(e.message || 'No se pudo aprobar.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-slate-100 gap-3">
          <div className="min-w-0">
            <h2 className="font-bold text-slate-800 text-lg">Aprobar recarga</h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{tx.users?.full_name || '—'} · {tx.users?.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Solicitó</span>
            <span className="text-lg font-black text-slate-800">{money(requested)}</span>
          </div>

          {tx.proof_url ? (
            <a href={tx.proof_url} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
              <img src={tx.proof_url} alt="Comprobante" className="w-full max-h-72 object-contain" />
              <span className="flex items-center justify-center gap-1 py-2 text-[11px] font-bold text-blue-600"><Paperclip size={11} /> Abrir comprobante</span>
            </a>
          ) : (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-xl p-3">No adjuntó comprobante.</p>
          )}

          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Monto a acreditar (Bs.)</span>
            <input
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-2xl font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>

          {differs && (
            <div className="flex gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Vas a acreditar <b>{money(value)}</b> en lugar de {money(requested)}. Al usuario le llega un aviso explicando la diferencia.
              </p>
            </div>
          )}

          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Comentario para el usuario (opcional)</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={differs ? 'Ej. El comprobante que recibimos es de Bs. 100. Si enviaste el resto, mandá otra recarga con su comprobante.' : 'Ej. ¡Gracias por recargar!'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </label>

          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} disabled={loading} className="flex-1 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={submit} disabled={loading || !valid} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-green-500 text-white hover:bg-green-600 transition-all disabled:opacity-50">
            <Check size={17} /> {loading ? 'Aprobando…' : `Aprobar ${valid ? money(value) : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
