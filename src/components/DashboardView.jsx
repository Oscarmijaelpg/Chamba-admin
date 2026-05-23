import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, Wallet, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import UserGrowthChart from './UserGrowthChart';

const StatCard = ({ title, value, icon: Icon, color, sub }) => (
  <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
        <p className="text-slate-500 text-xs sm:text-sm font-medium leading-tight">{title}</p>
        <h3 className="text-xl sm:text-2xl font-bold mt-1.5 text-slate-800 truncate">{value}</h3>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-xl shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
    </div>
  </div>
);

export default function DashboardView({ user }) {
  const navigate = useNavigate();
  const { stats, pendingTx, recentActivity, handleApprove, handleReject } = useDashboard(user);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Usuarios" value={stats.users} icon={Users} color="bg-primary-600" />
        <StatCard title="Activos 30 días" value={stats.activeUsers} icon={TrendingUp} color="bg-emerald-500" sub="usuarios con actividad" />
        <StatCard title="Chambas Activas" value={stats.chambas} icon={Briefcase} color="bg-primary-500" />
        <StatCard title="Volumen Pagos" value={`Bs. ${stats.revenue.toLocaleString()}`} icon={Wallet} color="bg-primary-700" />
        <StatCard title="Ganancia App" value={`Bs. ${stats.commission.toLocaleString()}`} icon={Wallet} color="bg-amber-500" />
      </div>

      <UserGrowthChart />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h2 className="font-bold text-lg">Recargas Pendientes</h2>
            <button onClick={() => navigate('/wallet')} className="text-primary-600 text-sm font-bold hover:underline">Ver Todo</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Monto</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingTx.length > 0 ? pendingTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{tx.users?.full_name}</p>
                      <p className="text-xs text-slate-400">{tx.type === 'deposit' ? 'Depósito' : 'Retiro'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800">Bs. {tx.amount}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleApprove(tx.id)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-all" title="Aprobar"><CheckCircle2 size={18} /></button>
                        <button onClick={() => handleReject(tx.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Rechazar"><XCircle size={18} /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-400 italic">No hay recargas pendientes.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <h2 className="font-bold text-lg mb-6">Actividad Reciente</h2>
          <div className="space-y-6">
            {recentActivity.length > 0 ? recentActivity.map(item => (
              <div key={item.id} className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                  {item.icon === 'briefcase' && <Briefcase size={16} />}
                  {item.icon === 'user' && <Users size={16} />}
                  {item.icon === 'wallet' && <Wallet size={16} />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.text}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{item.time}</p>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-400 italic">Sin actividad reciente</p>
            )}
          </div>
          <button
            onClick={() => navigate('/audit')}
            className="w-full mt-8 py-3 bg-slate-50 text-slate-500 text-sm font-bold rounded-xl hover:bg-slate-100 transition-all"
          >
            Ver Todo el Registro
          </button>
        </div>
      </div>
    </div>
  );
}
