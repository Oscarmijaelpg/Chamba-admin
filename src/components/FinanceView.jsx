import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Download,
  Filter
} from 'lucide-react';

export default function FinanceView() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const fetchTransactions = async () => {
    setLoading(true);
    let query = supabase
      .from('wallet_transactions')
      .select('*, users(full_name, email)')
      .order('created_at', { ascending: false });
    
    if (filter !== 'all') query = query.eq('status', filter);
    
    const { data, error } = await query;
    if (!error) setTransactions(data || []);
    setLoading(false);
  };

  const handleAction = async (id, status) => {
    const { error } = await supabase
      .from('wallet_transactions')
      .update({ status })
      .eq('id', id);
    if (!error) fetchTransactions();
  };

  const handleWithdrawalApproval = async (transactionId, approve) => {
    if (!approve) {
      // Reject
      await supabase
        .from('wallet_transactions')
        .update({ status: 'cancelled' })
        .eq('id', transactionId);
    } else {
      // Approve - Process withdrawal
      await supabase
        .from('wallet_transactions')
        .update({ status: 'completed' })
        .eq('id', transactionId);
    }
    
    fetchTransactions();
    
    // Show confirmation
    alert(approve ? 'Retiro aprobado ✅' : 'Retiro rechazado ❌');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Control Financiero</h2>
          <p className="text-slate-500 text-sm mt-1">Gestión de recargas, retiros y pagos en escrow.</p>
        </div>
        <div className="flex gap-3">
          <select 
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="completed">Completados</option>
            <option value="cancelled">Rechazados</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 shadow-lg shadow-primary-200 transition-all">
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
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
                        <button onClick={() => handleAction(tx.id, 'completed')} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-all" title="Aprobar"><CheckCircle2 size={18} /></button>
                        <button onClick={() => handleAction(tx.id, 'cancelled')} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Rechazar"><XCircle size={18} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Withdrawals Section */}
      <div className="space-y-6 mt-8">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Retiros Pendientes</h3>
          <p className="text-slate-500 text-sm mt-1">Aprueba o rechaza solicitudes de retiro.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-6 text-center text-slate-400 text-sm">Cargando...</td></tr>
              ) : transactions
                .filter(tx => tx.type === 'withdrawal' && tx.status === 'pending')
                .length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-6 text-center text-slate-400 text-sm">No hay retiros pendientes</td></tr>
              ) : (
                transactions
                  .filter(tx => tx.type === 'withdrawal' && tx.status === 'pending')
                  .map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{tx.users?.full_name}</p>
                          <p className="text-xs text-slate-400">{tx.users?.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-red-600">- Bs. {parseFloat(tx.amount).toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-3">
                          <button 
                            onClick={() => handleWithdrawalApproval(tx.id, true)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-all"
                          >
                            Aprobar
                          </button>
                          <button 
                            onClick={() => handleWithdrawalApproval(tx.id, false)}
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
  );
}
