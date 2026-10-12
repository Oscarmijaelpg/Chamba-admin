import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Activity, Users, CalendarDays, Eye, MapPin, Cake, Tag, Building2, Layers,
  AlertTriangle, CheckCircle2, Server, FileText, Clock, LayoutDashboard, Scale,
} from 'lucide-react';
import { useEngagement } from '../hooks/useEngagement';
import { useFunnel } from '../hooks/useFunnel';
import { useJobViewsTrend } from '../hooks/useJobViewsTrend';
import { useScraperHealth } from '../hooks/useScraperHealth';
import { useGeoAnalytics } from '../hooks/useGeoAnalytics';
import { useSearchInsights } from '../hooks/useSearchInsights';
import { useSupplyAnalytics } from '../hooks/useSupplyAnalytics';
import { usePreferenceAnalytics } from '../hooks/usePreferenceAnalytics';
import { useAgeAnalytics } from '../hooks/useAgeAnalytics';
import InfoTip from './InfoTip';

// Analytics en cuatro pestañas, cada una responde una pregunta. Cada pestaña es
// su propio componente para que solo se pidan los datos de la que está abierta.
const TABS = [
  { id: 'resumen', label: 'Resumen', icon: LayoutDashboard, hint: '¿Se está usando la app?' },
  { id: 'usuarios', label: 'Usuarios', icon: Users, hint: '¿Quiénes son y qué buscan?' },
  { id: 'oferta', label: 'Oferta y demanda', icon: Scale, hint: '¿Hay empleos donde hay gente?' },
  { id: 'scraper', label: 'Scraper', icon: Server, hint: '¿Están entrando empleos?' },
];

const PALETTE = ['#3B82F6', '#1BF28E', '#00A855', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const Card = ({ title, sub, icon: Icon, tip, right, children }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
    {title && (
      <div className="flex justify-between items-baseline gap-3 mb-4">
        <div>
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            {Icon && <Icon size={16} className="text-primary-500" />} {title}
            {tip && <InfoTip text={tip} />}
          </h4>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {right && <span className="text-xs text-slate-400 shrink-0">{right}</span>}
      </div>
    )}
    {children}
  </div>
);

const Kpi = ({ title, value, icon: Icon, color, tip }) => (
  <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
        <p className="text-slate-500 text-xs sm:text-sm font-medium leading-tight flex items-center gap-1">
          {title}{tip && <InfoTip text={tip} />}
        </p>
        <h3 className="text-xl sm:text-2xl font-bold mt-1.5 text-slate-800 truncate">{value}</h3>
      </div>
      <div className={`p-2.5 rounded-xl shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
    </div>
  </div>
);

const Empty = ({ children }) => <p className="text-slate-400 text-sm">{children}</p>;

export default function AnalyticsView() {
  const [tab, setTab] = useState('resumen');
  const current = TABS.find((t) => t.id === tab);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Analytics</h2>
        <p className="text-slate-500">{current.hint} Datos de los últimos 30 días.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              tab === id ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && <ResumenTab />}
      {tab === 'usuarios' && <UsuariosTab />}
      {tab === 'oferta' && <OfertaTab />}
      {tab === 'scraper' && <ScraperTab />}
    </div>
  );
}

// ───────────────────────── Resumen ─────────────────────────
function ResumenTab() {
  const { metrics, dauTrend, loading } = useEngagement();
  const { stages, loading: funnelLoading } = useFunnel();
  const { total: viewsTotal, loading: viewsLoading } = useJobViewsTrend();
  const v = (x) => (loading ? '…' : Number(x ?? 0).toLocaleString('es-BO'));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Activos hoy" value={v(metrics.dau)} icon={Activity} color="bg-emerald-500"
          tip="Personas distintas que usaron la app en las últimas 24 h." />
        <Kpi title="Activos esta semana" value={v(metrics.wau)} icon={Users} color="bg-primary-500"
          tip="Personas distintas activas en los últimos 7 días." />
        <Kpi title="Activos este mes" value={v(metrics.mau)} icon={CalendarDays} color="bg-primary-700"
          tip="Personas distintas activas en los últimos 30 días." />
        <Kpi title="Vistas de empleos" value={viewsLoading ? '…' : viewsTotal.toLocaleString('es-BO')} icon={Eye} color="bg-blue-500"
          tip="Veces que se abrió un empleo en 30 días. El detalle por origen y por empleo está en la sección Vistas." />
      </div>

      <Card title="Usuarios activos por día">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dauTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" name="Activos" dataKey="activos" stroke="#10B981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Embudo de conversión" sub="Del registro en adelante (usuarios únicos)">
        {funnelLoading ? <Empty>Cargando…</Empty> : (
          <div className="space-y-4">
            {stages.map((s) => (
              <div key={s.stage}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm font-semibold text-slate-700">{s.stage}</span>
                  <span className="text-sm">
                    <span className="font-bold text-slate-800">{s.value.toLocaleString('es-BO')}</span>
                    <span className="text-xs text-slate-400 ml-1.5">{s.pct}%</span>
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${Math.max(s.pct, 2)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ───────────────────────── Usuarios ─────────────────────────
function UsuariosTab() {
  const geo = useGeoAnalytics();
  const age = useAgeAnalytics();
  const prefs = usePreferenceAnalytics();

  const usersByCity = geo.byCity.filter((c) => c.city !== 'Sin ciudad');
  const topPreferences = prefs.byCategory.slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Usuarios por ciudad" icon={MapPin}>
          <ResponsiveContainer width="100%" height={Math.max(220, usersByCity.length * 34)}>
            <BarChart data={usersByCity} layout="vertical" margin={{ left: 12, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="city" width={78} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val, _n, p) => [`${val} usuarios (${p.payload.pct}%)`, p.payload.city]} />
              <Bar dataKey="users" radius={[0, 6, 6, 0]}>
                {usersByCity.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Edad" icon={Cake}
          sub={age.loading ? '' : `Promedio ${age.avg ?? '—'} · mediana ${age.median ?? '—'} · ${age.withAge} usuarios la registraron (${age.coverage}%)`}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={age.distribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="rango" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val) => [`${val} usuarios`, 'Usuarios']} />
              <Bar dataKey="usuarios" radius={[6, 6, 0, 0]}>
                {age.distribution.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Qué empleos buscan" icon={Tag}
        tip="Cuántos usuarios guardaron cada categoría como preferencia. Una categoría muy pedida con poca oferta abierta es una oportunidad."
        sub={prefs.loading ? '' : `${prefs.totalUsers.toLocaleString('es-BO')} usuarios guardaron preferencias · ${prefs.notifyUsers.toLocaleString('es-BO')} con alertas activas`}>
        {topPreferences.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(220, topPreferences.length * 30)}>
            <BarChart data={topPreferences} layout="vertical" margin={{ left: 12, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 10 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val, _n, p) => [`${val} usuarios (${p.payload.pct}%)`, 'Interesados']} />
              <Bar dataKey="users" radius={[0, 4, 4, 0]}>
                {topPreferences.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty>Aún no hay preferencias guardadas.</Empty>}
      </Card>
    </div>
  );
}

// ───────────────────────── Oferta y demanda ─────────────────────────
function OfertaTab() {
  const geo = useGeoAnalytics();
  const supply = useSupplyAnalytics(30);
  const search = useSearchInsights(30);
  const topCategories = supply.byCategory.slice(0, 10);

  return (
    <div className="space-y-6">
      {!geo.loading && geo.gap && geo.gap.deficit > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-bold">{geo.gap.city}</span> concentra{' '}
            <span className="font-bold">{geo.gap.usuarios}</span> usuarios pero solo tiene{' '}
            <span className="font-bold">{geo.gap.empleos}</span> empleos abiertos: hay demanda sin oferta.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Usuarios vs empleos por ciudad" icon={Building2}
          tip="Usuarios registrados (demanda) frente a empleos abiertos (oferta). Barras muy dispares = descompensación.">
          <ResponsiveContainer width="100%" height={Math.max(220, geo.compare.length * 38)}>
            <BarChart data={geo.compare} layout="vertical" margin={{ left: 12, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="city" width={78} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar name="Usuarios" dataKey="usuarios" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              <Bar name="Empleos abiertos" dataKey="empleos" fill="#1BF28E" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Empleos abiertos por rubro" icon={Layers}>
          <ResponsiveContainer width="100%" height={Math.max(220, topCategories.length * 26)}>
            <BarChart data={topCategories} layout="vertical" margin={{ left: 12, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 10 }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val) => [`${val} empleos`, 'Abiertos']} />
              <Bar dataKey="jobs" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Empleos nuevos vs vistas por día"
        tip="Si las vistas crecen más rápido que los empleos nuevos, falta inventario.">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={supply.supplyDemand}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" name="Empleos nuevos" dataKey="nuevos" fill="#1BF28E" radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" name="Vistas" dataKey="vistas" stroke="#3B82F6" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Búsquedas por día"
        right={search.loading ? '' : `${search.total.toLocaleString('es-BO')} en 30 días`}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={search.perDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" name="Búsquedas" dataKey="busquedas" stroke="#3B82F6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

// ───────────────────────── Scraper ─────────────────────────
function relTime(iso) {
  if (!iso) return '—';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'hace instantes';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

const STATUS_STYLES = {
  success: { label: 'Éxito', cls: 'bg-emerald-50 text-emerald-600' },
  partial: { label: 'Parcial', cls: 'bg-amber-50 text-amber-600' },
  failure: { label: 'Falló', cls: 'bg-red-50 text-red-500' },
  running: { label: 'Corriendo', cls: 'bg-blue-50 text-blue-600' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? { label: status ?? '—', cls: 'bg-slate-100 text-slate-500' };
  return <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

function ScraperTab() {
  const { bySource, stats, loading } = useScraperHealth();
  const supply = useSupplyAnalytics(30);
  // Empleos abiertos de cada fuente, para verlos junto a su última corrida.
  const openBySource = new Map(supply.bySource.map((s) => [s.source, s.jobs]));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Última corrida" value={loading ? '…' : relTime(stats.lastRunAt)} icon={Clock} color="bg-amber-500" />
        <Kpi title="Corridas con éxito" value={loading ? '…' : `${stats.successRate}%`} icon={CheckCircle2} color="bg-emerald-500"
          tip="Porcentaje de corridas que terminaron bien en los últimos 30 días." />
        <Kpi title="Corridas" value={loading ? '…' : stats.totalRuns} icon={Server} color="bg-primary-500" />
        <Kpi title="Empleos abiertos" value={loading ? '…' : stats.activeJobs.toLocaleString('es-BO')} icon={FileText} color="bg-primary-700"
          tip="Empleos traídos por el scraper que están abiertos ahora." />
      </div>

      <Card title="Estado por fuente" sub="Última corrida de cada portal">
        {bySource.length > 0 ? (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="px-2 py-2 font-bold">Fuente</th>
                  <th className="px-2 py-2 font-bold">Última corrida</th>
                  <th className="px-2 py-2 font-bold text-right">Nuevos</th>
                  <th className="px-2 py-2 font-bold text-right">Abiertos</th>
                  <th className="px-2 py-2 font-bold text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bySource.map((r) => (
                  <tr key={r.source}>
                    <td className="px-2 py-2.5 font-semibold text-slate-700">{r.source}</td>
                    <td className="px-2 py-2.5 text-slate-400 text-xs">{relTime(r.started_at)}</td>
                    <td className="px-2 py-2.5 text-right text-slate-600">{r.jobs_inserted ?? 0}</td>
                    <td className="px-2 py-2.5 text-right text-slate-600">{openBySource.get(r.source)?.toLocaleString('es-BO') ?? '—'}</td>
                    <td className="px-2 py-2.5 text-center"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty>Sin corridas registradas.</Empty>}
      </Card>
    </div>
  );
}
