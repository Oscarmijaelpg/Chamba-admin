import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import Pagination from './Pagination';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  ArrowUpRight, ArrowDownLeft, CheckCircle2, XCircle, Clock,
  Plus, Wallet, Coins, TrendingUp, PiggyBank, Search, X, Check, AlertCircle,
} from 'lucide-react';

const money = (n) => `Bs. ${Number(n ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// Etiqueta / color / signo por tipo de transacción (incluye los del escrow).
const TYPE_META = {
  deposit:           { label: 'Recarga',        sign: '+', cls: 'text-green-600', bg: 'bg-green-50 text-green-600' },
  refund:            { label: 'Devolución',     sign: '+', cls: 'text-green-600', bg: 'bg-green-50 text-green-600' },
  payout:            { label: 'Pago recibido',  sign: '+', cls: 'text-green-600', bg: 'bg-green-50 text-green-600' },
  withdrawal:        { label: 'Retiro',         sign: '-', cls: 'text-red-600',   bg: 'bg-red-50 text-red-600' },
  payment:           { label: 'A custodia',     sign: '-', cls: 'text-amber-600', bg: 'bg-amber-50 text-amber-600' },
  commission:        { label: 'Comisión',       sign: '',  cls: 'text-slate-600', bg: 'bg-slate-100 text-slate-600' },
  publish_chamba:    { label: 'Publicar chamba',sign: '-', cls: 'text-slate-600', bg: 'bg-slate-100 text-slate-600' },
  publish_job:       { label: 'Publicar empleo',sign: '-', cls: 'text-slate-600', bg: 'bg-slate-100 text-slate-600' },
  publish_highlight: { label: 'Destacar',       sign: '-', cls: 'text-slate-600', bg: 'bg-slate-100 text-slate-600' },
  purchase_premium:  { label: 'Premium',        sign: '-', cls: 'text-slate-600', bg: 'bg-slate-100 text-slate-600' },
};
const metaFor = (t) => TYPE_META[t] ?? { label: t, sign: '', cls: 'text-slate-600', bg: 'bg-slate-100 text-slate-600' };

const Kpi = ({ title, value, icon: Icon, color, sub }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
        <p className="text-slate-500 text-xs font-medium leading-tight">{title}</p>
        <h3 className="text-lg sm:text-xl font-bold mt-1.5 text-slate-800 truncate">{value}</h3>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-xl shrink-0 ${color}`}><Icon size={18} className="text-white" /></div>
    </div>
  </div>
);

function RechargeModal({ onClose, onCredit, crediting, searchUsers, onToast }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const doSearch = async (t) => {
    setTerm(t);
    setResults(await searchUsers(t));
  };

  const submit = async () => {
    const amt = Number(amount);
    if (!picked || !amt || amt <= 0) return;
    try {
      await onCredit(picked.id, amt, reason);
      onToast('ok', `Se recargaron ${money(amt)} a ${picked.full_name || picked.email}.`);
      onClose();
    } catch (e) {
      onToast('error', e.message || 'No se pudo recargar.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Recargar saldo</h3>
              <p className="text-slate-500 text-sm mt-0.5">Acredita saldo a la billetera de un usuario.</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>

          {!picked ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Buscar usuario por nombre o email…"
                  value={term}
                  onChange={(e) => doSearch(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {results.map((u) => (
                  <button key={u.id} onClick={() => setPicked(u)} className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{u.full_name || '—'}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-500 shrink-0">{money(u.wallet_balance)}</span>
                  </button>
                ))}
                {term.length >= 2 && results.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">Sin resultados</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{picked.full_name || '—'}</p>
                  <p className="text-xs text-slate-400 truncate">{picked.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Saldo actual</p>
                  <p className="text-sm font-bold text-slate-700">{money(picked.wallet_balance)}</p>
                </div>
              </div>
              <button onClick={() => setPicked(null)} className="text-xs text-primary-600 font-semibold">← Elegir otro usuario</button>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Monto a recargar (Bs.)</label>
                <input type="number" min="0" step="0.5" autoFocus className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary-500" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1.5">Motivo (opcional)</label>
                <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ej: pago por QR verificado" value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <button onClick={submit} disabled={crediting || !(Number(amount) > 0)} className="w-full py-3 rounded-xl font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 transition-all">
                {crediting ? 'Recargando…' : `Recargar ${amount ? money(Number(amount)) : ''}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FinanceView() {
  const [filter, setFilter] = useState('all');
  const [showRecharge, setShowRecharge] = useState(false);
  const [toast, setToast] = useState(null);
  const {
    transactions, pendingWithdrawals, summary, loading, isFetching,
    approveTransaction, rejectTransaction, creditWallet, crediting, searchUsers,
    page, setPage, totalPages, total, pageSize,
  } = useFinance(filter);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); };
  const daily = (summary?.daily ?? []).map((d) => ({ ...d, label: d.day.slice(5).replace('-', '/') }));

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'ok' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'ok' ? <Check size={16} /> : <AlertCircle size={16} />}{toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Control Financiero</h2>
          <p className="text-slate-500 text-sm mt-1">Recargas, retiros, pagos en custodia y comisiones.</p>
        </div>
        <button onClick={() => setShowRecharge(true)} className="sm:ml-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all">
          <Plus size={16} /> Recargar saldo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Kpi title="Recargas totales" value={money(summary?.deposits_total)} icon={ArrowDownLeft} color="bg-green-500" />
        <Kpi title="Pagado a trabajadores" value={money(summary?.payouts_total)} icon={Wallet} color="bg-blue-500" />
        <Kpi title="Comisión ganada" value={money(summary?.commission_total)} icon={TrendingUp} color="bg-primary-600" />
        <Kpi title="En custodia" value={money(summary?.escrow_held)} icon={PiggyBank} color="bg-amber-500" />
        <Kpi title="Retiros pendientes" value={money(summary?.pending_withdrawals)} icon={Coins} color="bg-red-500" />
      </div>

      {/* Gráfico movimiento diario */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-bold text-slate-800 mb-1">Movimiento diario (últimos 30 días)</h3>
        <p className="text-xs text-slate-400 mb-4">Entradas (recargas + devoluciones) vs. salidas (retiros + pagos) y comisión.</p>
        <div className="h-64">
          {daily.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin movimientos aún</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={20} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={44} />
                <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="inflow" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outflow" name="Salidas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="commission" name="Comisión" fill="#1BF28E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Tabla transacciones */}
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-bold text-slate-800">Transacciones</h3>
        <select className="ml-auto bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="completed">Completados</option>
          <option value="cancelled">Rechazados</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[560px]">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Transacción</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">Cargando transacciones...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">No hay transacciones</td></tr>
              ) : transactions.map((tx) => {
                const m = metaFor(tx.type);
                const positive = m.sign === '+';
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${m.bg}`}>
                          {positive ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm">{m.label}</p>
                          <p className="text-[10px] text-slate-400 truncate w-32">{tx.description || tx.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{tx.users?.full_name}</p>
                      <p className="text-xs text-slate-400">{tx.users?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${m.cls}`}>{m.sign} {money(tx.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 w-fit ${
                        tx.status === 'completed' ? 'bg-primary-50 text-primary-600' :
                        tx.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {tx.status === 'completed' ? <CheckCircle2 size={10} /> : tx.status === 'pending' ? <Clock size={10} /> : <XCircle size={10} />}
                        {tx.status === 'completed' ? 'Completado' : tx.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{new Date(tx.created_at).toLocaleDateString('es-BO')}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {tx.status === 'pending' && (
                          <>
                            <button onClick={() => approveTransaction(tx.id)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-all" title="Aprobar"><CheckCircle2 size={18} /></button>
                            <button onClick={() => rejectTransaction(tx.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Rechazar"><XCircle size={18} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} isFetching={isFetching} />

      {/* Retiros pendientes */}
      <div className="space-y-4 mt-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Retiros Pendientes</h3>
          <p className="text-slate-500 text-sm mt-1">Aprueba o rechaza solicitudes de retiro.</p>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[400px]">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan="4" className="px-6 py-6 text-center text-slate-400 text-sm">Cargando...</td></tr>
                ) : pendingWithdrawals.length === 0 ? (
                  <tr><td colSpan="4" className="px-6 py-6 text-center text-slate-400 text-sm">No hay retiros pendientes</td></tr>
                ) : pendingWithdrawals.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800 text-sm">{tx.users?.full_name}</p>
                      <p className="text-xs text-slate-400">{tx.users?.email}</p>
                    </td>
                    <td className="px-4 py-3"><span className="font-bold text-red-600 whitespace-nowrap">- {money(tx.amount)}</span></td>
                    <td className="px-4 py-3 text-slate-500 text-sm whitespace-nowrap">{new Date(tx.created_at).toLocaleDateString('es-BO')}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => approveTransaction(tx.id)} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-all">Aprobar</button>
                        <button onClick={() => rejectTransaction(tx.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-all">Rechazar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showRecharge && (
        <RechargeModal
          onClose={() => setShowRecharge(false)}
          onCredit={creditWallet}
          crediting={crediting}
          searchUsers={searchUsers}
          onToast={showToast}
        />
      )}
    </div>
  );
}
