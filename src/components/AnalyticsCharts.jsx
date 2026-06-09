import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAnalytics } from '../hooks/useAnalytics';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AnalyticsCharts() {
  const { userTrend, revenueTrend, eventStats, loading } = useAnalytics();

  if (loading) return <div className="text-center py-8 text-slate-500">Cargando datos...</div>;

  return (
    <div className="space-y-6">
      {/* Event volume per day */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800">Eventos por Día (Últimos 30 días)</h3>
        <p className="text-sm text-slate-400 mb-4">Total de acciones (vistas, logins, búsquedas…), no usuarios únicos. Para activos únicos, ver “Usuarios activos por día”.</p>
        {userTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" name="Eventos" dataKey="users" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500">Sin datos</p>
        )}
      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Ingresos por Día (Últimos 30 días)</h3>
        {revenueTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar name="Ingresos (Bs.)" dataKey="revenue" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500">Sin depósitos registrados todavía.</p>
        )}
      </div>

      {/* Event Distribution */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Distribución de Eventos (Últimos 30 días)</h3>
        {eventStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={eventStats} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                {eventStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500">Sin datos</p>
        )}
      </div>
    </div>
  );
}
