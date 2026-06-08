import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Cake, TrendingUp, Users, Percent } from 'lucide-react';
import { useAgeAnalytics } from '../hooks/useAgeAnalytics';

const Kpi = ({ title, value, icon: Icon, color, sub }) => (
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

const BAR_COLORS = ['#3B82F6', '#1BF28E', '#00A855', '#F59E0B', '#8B5CF6'];

export default function AgeAnalytics() {
  const { withAge, avg, median, min, max, coverage, distribution, loading } = useAgeAnalytics();

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Edad de los usuarios</h3>
        <p className="text-sm text-slate-500">
          Basado en los {loading ? '…' : withAge} usuarios que registraron su edad
          {loading ? '' : ` (${coverage}% del total)`}.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi
          title="Edad promedio"
          value={loading ? '…' : avg ?? '—'}
          icon={Cake}
          color="bg-primary-500"
          sub={!loading && min != null ? `rango ${min}–${max} años` : undefined}
        />
        <Kpi title="Edad mediana" value={loading ? '…' : median ?? '—'} icon={TrendingUp} color="bg-blue-500" />
        <Kpi title="Con edad registrada" value={loading ? '…' : withAge} icon={Users} color="bg-emerald-500" />
        <Kpi
          title="Cobertura"
          value={loading ? '…' : `${coverage}%`}
          icon={Percent}
          color="bg-amber-500"
          sub="del total de usuarios"
        />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h4 className="font-bold text-slate-800 mb-4">Distribución por rango de edad</h4>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={distribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="rango" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => [`${v} usuarios`, 'Usuarios']} />
            <Bar dataKey="usuarios" radius={[6, 6, 0, 0]}>
              {distribution.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
