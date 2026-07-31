import React, { useState } from 'react';
import { Scale, Check, AlertCircle, User, Briefcase, Coins } from 'lucide-react';
import { useDisputes } from '../hooks/useDisputes';
import { useSettings } from '../hooks/useSettings';
import Pagination from './Pagination';

const money = (n) => `Bs. ${Number(n ?? 0).toLocaleString('es-BO')}`;
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

// Modal de mediación: el admin elige a dónde va el dinero congelado.
function ResolveModal({ dispute, rate, onClose, onResolve, busy }) {
  const amount = Number(dispute.amount ?? 0);
  const [resolution, setResolution] = useState('release');
  const [workerStr, setWorkerStr] = useState(String(amount));

  const workerSplit = Math.min(amount, Math.max(0, Number(workerStr) || 0));
  const employerSplit = +(amount - workerSplit).toFixed(2);

  const effWorker = resolution === 'release' ? amount : resolution === 'refund' ? 0 : workerSplit;
  const effEmployer = resolution === 'release' ? 0 : resolution === 'refund' ? amount : employerSplit;
  const commission = +((effWorker * rate) / 100).toFixed(2);
  const workerNet = +(effWorker - commission).toFixed(2);
  const splitValid = resolution !== 'split' || (Number(workerStr) !== '' && workerSplit >= 0 && employerSplit >= 0);

  const options = [
    { id: 'release', label: 'Pagar al trabajador', desc: 'Todo el monto va al trabajador (menos comisión).', icon: User },
    { id: 'refund', label: 'Devolver al empleador', desc: 'Todo el monto vuelve al empleador.', icon: Briefcase },
    { id: 'split', label: 'Dividir', desc: 'Repartir el monto entre ambos.', icon: Scale },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          <div>
            <h3 className="font-bold text-slate-800 text-lg leading-tight">Resolver disputa</h3>
            <p className="text-slate-500 text-sm mt-1">{dispute.chamba?.title ?? 'Chamba'}</p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl">
            <Coins size={20} className="text-amber-500 shrink-0" />
            <div>
              <p className="text-xs text-amber-700 font-medium">Monto congelado</p>
              <p className="text-lg font-black text-amber-800">{money(amount)}</p>
            </div>
          </div>

          <div className="space-y-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setResolution(opt.id)}
                className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                  resolution === opt.id ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <opt.icon size={18} className={resolution === opt.id ? 'text-primary-600 mt-0.5' : 'text-slate-400 mt-0.5'} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{opt.label}</p>
                  <p className="text-xs text-slate-500">{opt.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${resolution === opt.id ? 'border-primary-500' : 'border-slate-300'}`}>
                  {resolution === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />}
                </div>
              </button>
            ))}
          </div>

          {resolution === 'split' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Al trabajador</label>
                <input
                  type="number" min="0" max={amount} step="0.5"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={workerStr}
                  onChange={(e) => setWorkerStr(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Al empleador</label>
                <div className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600">{money(employerSplit)}</div>
              </div>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 rounded-xl text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Trabajador recibe (neto)</span><span className="font-bold text-slate-800">{money(workerNet)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Empleador recibe</span><span className="font-bold text-slate-800">{money(effEmployer)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Comisión ({rate}%)</span><span className="font-bold text-slate-800">{money(commission)}</span></div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} disabled={busy} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 disabled:opacity-50">
              Cancelar
            </button>
            <button
              onClick={() => onResolve({
                disputeId: dispute.id,
                resolution,
                workerAmount: resolution === 'split' ? workerSplit : 0,
                employerAmount: resolution === 'split' ? employerSplit : 0,
              })}
              disabled={busy || !splitValid}
              className="flex-1 px-4 py-3 rounded-xl font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-all disabled:opacity-50"
            >
              {busy ? 'Procesando…' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DisputesView() {
  const [filter, setFilter] = useState('open');
  const [target, setTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const { settings } = useSettings();
  const rate = Number(settings?.commission_rate ?? 10);
  const d = useDisputes(filter);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); };

  const handleResolve = async (payload) => {
    try {
      await d.resolve(payload);
      setTarget(null);
      showToast('ok', 'Disputa resuelta.');
    } catch (e) {
      showToast('error', e.message || 'No se pudo resolver la disputa.');
    }
  };

  const TABS = [{ id: 'open', label: 'Abiertas' }, { id: 'resolved', label: 'Resueltas' }];

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'ok' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'ok' ? <Check size={16} /> : <AlertCircle size={16} />}{toast.msg}
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Scale size={24} className="text-primary-600" /> Disputas</h2>
        <p className="text-slate-500 text-sm mt-1">Media los pagos en custodia cuando una chamba se cancela o abandona en curso.</p>
      </div>

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${filter === tab.id ? 'bg-primary-500 text-white shadow-lg shadow-primary-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {d.loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" /></div>
      ) : d.disputes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center text-slate-400">
          <Scale size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-semibold">No hay disputas {filter === 'open' ? 'abiertas' : 'resueltas'}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {d.disputes.map((dp) => (
            <div key={dp.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 truncate">{dp.chamba?.title ?? 'Chamba'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Abierta por {dp.opener?.full_name ?? '—'} · {fmtDate(dp.created_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-slate-400 uppercase font-bold">Congelado</p>
                  <p className="font-black text-slate-800">{money(dp.amount)}</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 mt-3 bg-slate-50 rounded-xl p-3 border-l-2 border-slate-200">“{dp.reason}”</p>

              {filter === 'open' ? (
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => setTarget(dp)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-all"
                  >
                    <Scale size={16} /> Resolver
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-4 text-xs font-semibold">
                  <span className="px-3 py-1 rounded-full bg-green-50 text-green-600">
                    Resuelta: {dp.resolution === 'release' ? 'pagó al trabajador' : dp.resolution === 'refund' ? 'devolvió al empleador' : 'dividido'}
                  </span>
                  {dp.resolution === 'split' && (
                    <span className="text-slate-400">Trab. {money(dp.worker_amount)} · Emp. {money(dp.employer_amount)}</span>
                  )}
                </div>
              )}
            </div>
          ))}

          <Pagination page={d.page} totalPages={d.totalPages} total={d.total} pageSize={d.pageSize} onPage={d.setPage} isFetching={d.isFetching} />
        </div>
      )}

      {target && (
        <ResolveModal dispute={target} rate={rate} busy={d.resolving} onClose={() => setTarget(null)} onResolve={handleResolve} />
      )}
    </div>
  );
}
