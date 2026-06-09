import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import Pagination from './Pagination';
import {
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Download
} from 'lucide-react';

export default function FinanceView() {
  const [filter, setFilter] = useState('all');
  const {
    transactions, pendingWithdrawals, loading, isFetching,
    approveTransaction, rejectTransaction,
    page, setPage, totalPages, total, pageSize,
  } = useFinance(filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Control Financiero</h2>
          <p className="text-slate-500 text-sm mt-1">Gestión de recargas, retiros y pagos en escrow.</p>
        </div>
        <div className="flex gap-3 sm:ml-auto">
          <select
            className="flex-1 sm:flex-none bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="completed">Completados</option>
            <option value="cancelled">Rechazados</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all whitespace-nowrap">
            <Download size={16} /> Exportar
          </button>
        </div>
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
            ) : transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-50/50 transition-all">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tx.type === 'deposit' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {tx.type === 'deposit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{tx.type === 'deposit' ? 'Recarga' : 'Retiro'}</p>
                      <p className="text-[10px] text-slate-400 truncate w-32">{tx.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-800 text-sm">{tx.users?.full_name}</p>
                  <p className="text-xs text-slate-400">{tx.users?.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-bold ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'deposit' ? '+' : '-'} Bs. {tx.amount}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 w-fit ${
                    tx.status === 'completed' ? 'bg-primary-50 text-primary-600' : 
                    tx.status === 'pending' ? 'bg-amber-50 text-amber-600' : 
                    'bg-red-50 text-red-600'
                  }`}>
                    {tx.status === 'completed' ? <CheckCircle2 size={10} /> : tx.status === 'pending' ? <Clock size={10} /> : <XCircle size={10} />}
                    {tx.status === 'completed' ? 'Completado' : tx.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 text-sm">
                  {new Date(tx.created_at).toLocaleDateString()}
                </td>
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
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPage={setPage}
        isFetching={isFetching}
      />

      {/* Withdrawals Section */}
      <div className="space-y-6 mt-8">
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
              ) : (
                pendingWithdrawals
                  .map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{tx.users?.full_name}</p>
                          <p className="text-xs text-slate-400">{tx.users?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-red-600 whitespace-nowrap">- Bs. {parseFloat(tx.amount).toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-sm whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => approveTransaction(tx.id)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-all"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => rejectTransaction(tx.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 transition-all"
                          >
                            Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
