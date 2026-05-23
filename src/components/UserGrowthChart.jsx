import React, { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { useUserGrowth } from '../hooks/useUserGrowth';
import { TrendingUp, Users } from 'lucide-react';

const PERIOD_KEYS = ['7d', '30d', '90d'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.dataKey === 'nuevos' ? 'Nuevos: ' : 'Total: '}
          <span className="text-slate-800">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function UserGrowthChart() {
  const { data, loading, period, setPeriod, periods, totalPeriod } = useUserGrowth();
  const [view, setView] = useState('nuevos'); // 'nuevos' | 'acumulado'

  const hasData = data.some(d => d.nuevos > 0);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-5 sm:p-6 border-b border-slate-50">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <TrendingUp size={18} className="text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base leading-tight">Crecimiento de usuarios</h3>
              <p className="text-slate-400 text-xs mt-0.5">{periods[period].label}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:ml-auto items-start sm:items-center">
            {/* Toggle nuevos / acumulado */}
            <div className="flex bg-slate-100 rounded-xl p-1 text-xs font-bold">
              <button
                onClick={() => setView('nuevos')}
                className={`px-3 py-1.5 rounded-lg transition-all ${view === 'nuevos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
              >
                Por día
              </button>
              <button
                onClick={() => setView('acumulado')}
                className={`px-3 py-1.5 rounded-lg transition-all ${view === 'acumulado' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
              >
                Acumulado
              </button>
            </div>

            {/* Selector de período */}
            <div className="flex bg-slate-100 rounded-xl p-1 text-xs font-bold">
              {PERIOD_KEYS.map(k => (
                <button
                  key={k}
                  onClick={() => setPeriod(k)}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${period === k ? 'bg-primary-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {k === '7d' ? '7 días' : k === '30d' ? '30 días' : '3 meses'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stat rápida */}
        <div className="mt-4 flex items-center gap-2">
          <Users size={14} className="text-primary-500" />
          <span className="text-2xl font-black text-slate-800">{totalPeriod}</span>
          <span className="text-slate-400 text-sm">nuevos usuarios en {periods[period].label.toLowerCase()}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-52 gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Cargando datos...</span>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-52 text-slate-300 gap-3">
            <Users size={36} />
            <p className="text-sm font-medium text-slate-400">Sin registros en este período</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradNuevos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAcumulado" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {view === 'nuevos' ? (
                <Area
                  type="monotone"
                  dataKey="nuevos"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#gradNuevos)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey="acumulado"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#gradAcumulado)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
