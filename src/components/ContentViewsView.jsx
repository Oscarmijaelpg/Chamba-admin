import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { Eye, Smartphone, Globe, Loader2, Briefcase, Wrench, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

// De dónde se ven los empleos y chambas: desde la app o desde la web pública.
// El origen se empezó a registrar el 2026-08-05; los eventos anteriores salen
// como "desconocido" (no se puede inventar de dónde vinieron).
const RANGES = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
];

const SOURCE_META = {
  app: { label: 'App', color: '#1BF28E' },
  site: { label: 'Web', color: '#2563EB' },
  desconocido: { label: 'Sin origen', color: '#CBD5E1' },
};

export default function ContentViewsView() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('jobs');

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }, [days]);

  const { data: series = [], isLoading } = useQuery({
    queryKey: ['content-views-source', since],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_views_by_source')
        .select('day, event_name, source, views')
        .gte('day', since);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: topJobs = [] } = useQuery({
    queryKey: ['job-views-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_views_stats').select('*').order('views', { ascending: false }).limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: topChambas = [] } = useQuery({
    queryKey: ['chamba-views-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chamba_views_stats').select('*').order('views', { ascending: false }).limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Totales por origen (para las tarjetas de arriba).
  const totals = useMemo(() => {
    const acc = { app: 0, site: 0, desconocido: 0 };
    for (const r of series) acc[r.source] = (acc[r.source] ?? 0) + Number(r.views);
    return acc;
  }, [series]);

  // Serie diaria apilada app/web.
  const chartData = useMemo(() => {
    const byDay = new Map();
    for (const r of series) {
      const row = byDay.get(r.day) ?? { day: r.day, app: 0, site: 0, desconocido: 0 };
      row[r.source] = (row[r.source] ?? 0) + Number(r.views);
      byDay.set(r.day, row);
    }
    return [...byDay.values()]
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((r) => ({ ...r, dia: r.day.slice(5) })); // MM-DD
  }, [series]);

  const rows = tab === 'jobs' ? topJobs : topChambas;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Vistas de contenido</h2>
        <p className="text-slate-500">Cuánto se ven los empleos y las chambas, y desde dónde.</p>
      </div>

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button key={r.days} onClick={() => setDays(r.days)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              days === r.days ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Smartphone} label="Vistas desde la app" value={totals.app} color="text-emerald-600 bg-emerald-50" />
        <StatCard icon={Globe} label="Vistas desde la web" value={totals.site} color="text-blue-600 bg-blue-50" />
        <StatCard icon={HelpCircle} label="Sin origen (histórico)" value={totals.desconocido} color="text-slate-500 bg-slate-100" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Eye size={18} /> Vistas por día</h3>
        {isLoading ? (
          <div className="h-72 flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : chartData.length === 0 ? (
          <p className="h-72 flex items-center justify-center text-slate-400">Sin datos en este período.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar stackId="v" dataKey="app" name={SOURCE_META.app.label} fill={SOURCE_META.app.color} radius={[0, 0, 0, 0]} />
              <Bar stackId="v" dataKey="site" name={SOURCE_META.site.label} fill={SOURCE_META.site.color} radius={[0, 0, 0, 0]} />
              <Bar stackId="v" dataKey="desconocido" name={SOURCE_META.desconocido.label} fill={SOURCE_META.desconocido.color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <p className="mt-3 text-xs text-slate-400">
          El origen se registra desde el 5 de agosto de 2026. Las vistas anteriores aparecen como “sin origen”.
        </p>
      </div>

      {/* Ranking */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-100">
          <TabBtn active={tab === 'jobs'} onClick={() => setTab('jobs')} icon={Briefcase} label={`Empleos (${topJobs.length})`} />
          <TabBtn active={tab === 'chambas'} onClick={() => setTab('chambas')} icon={Wrench} label={`Chambas (${topChambas.length})`} />
        </div>

        {rows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            Todavía no hay vistas identificadas.
            {tab === 'jobs' && (
              <span className="block mt-2 text-sm text-slate-400">
                Las vistas de empleos no guardaban a qué empleo correspondían; se corrigió el 5 de agosto de 2026,
                así que el ranking empieza desde esa fecha.
              </span>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left font-semibold px-4 py-3">Título</th>
                  <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Ciudad</th>
                  <th className="text-right font-semibold px-4 py-3">Vistas</th>
                  <th className="text-right font-semibold px-4 py-3">App</th>
                  <th className="text-right font-semibold px-4 py-3">Web</th>
                  <th className="text-right font-semibold px-4 py-3 hidden sm:table-cell">7 días</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.job_id ?? r.chamba_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800 line-clamp-1">{r.title}</span>
                      {r.company && <span className="block text-xs text-slate-400">{r.company}</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{r.city ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{r.views}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{r.views_app}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{r.views_site}</td>
                    <td className="px-4 py-3 text-right text-slate-500 hidden sm:table-cell">{r.views_7d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}><Icon size={20} /></span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-800">{Number(value || 0).toLocaleString('es-BO')}</p>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-bold text-sm transition-colors ${
        active ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-700'
      }`}>
      <Icon size={16} /> {label}
    </button>
  );
}
