import React from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity, Users, Repeat, CalendarDays, FileText, Server, CheckCircle2,
  AlertTriangle, Clock,
} from 'lucide-react';
import { useEngagement } from '../hooks/useEngagement';
import { useFunnel } from '../hooks/useFunnel';
import { useJobViewsTrend } from '../hooks/useJobViewsTrend';
import { useScraperHealth } from '../hooks/useScraperHealth';
import InfoTip from './InfoTip';

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
);

const Kpi = ({ title, value, icon: Icon, color, sub, tip }) => (
  <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
        <p className="text-slate-500 text-xs sm:text-sm font-medium leading-tight flex items-center gap-1">
          {title}{tip && <InfoTip text={tip} />}
        </p>
        <h3 className="text-xl sm:text-2xl font-bold mt-1.5 text-slate-800 truncate">{value}</h3>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-xl shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
    </div>
  </div>
);

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

export default function ProjectAnalytics() {
  const { metrics, dauTrend, loading: engLoading } = useEngagement();
  const { stages, loading: funnelLoading } = useFunnel();
  const { data: viewsTrend, total: viewsTotal, loading: viewsLoading } = useJobViewsTrend();
  const { runs, bySource, insertedTrend, stats, loading: scraperLoading } = useScraperHealth();

  return (
    <div className="space-y-8">
      {/* ===== Recurrencia / Engagement ===== */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Recurrencia de usuarios</h3>
          <p className="text-sm text-slate-500">
            Calculado desde eventos de la app. Para cohortes y retención detallada, ver PostHog.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi title="Activos hoy (DAU)" value={engLoading ? '…' : metrics.dau} icon={Activity} color="bg-emerald-500"
            tip="Daily Active Users: personas distintas que usaron la app en las últimas 24 h." />
          <Kpi title="Activos semana (WAU)" value={engLoading ? '…' : metrics.wau} icon={Users} color="bg-primary-500"
            tip="Weekly Active Users: personas distintas activas en los últimos 7 días." />
          <Kpi title="Activos mes (MAU)" value={engLoading ? '…' : metrics.mau} icon={CalendarDays} color="bg-primary-700"
            tip="Monthly Active Users: personas distintas activas en los últimos 30 días." />
          <Kpi title="Stickiness" value={engLoading ? '…' : `${metrics.stickiness}%`} icon={Repeat} color="bg-amber-500" sub="DAU / MAU"
            tip="DAU ÷ MAU. Qué % de los activos del mes vuelve a diario; más alto = más recurrencia." />
        </div>

        <Card>
          <h4 className="font-bold text-slate-800 mb-4">Usuarios activos por día (30 días)</h4>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dauTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="activos" stroke="#10B981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* ===== Embudo + Postulaciones ===== */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h4 className="font-bold text-slate-800 mb-1">Embudo de conversión</h4>
          <p className="text-xs text-slate-400 mb-5">Del registro al primer pago (usuarios únicos)</p>
          {funnelLoading ? (
            <p className="text-slate-400 text-sm">Cargando…</p>
          ) : (
            <div className="space-y-4">
              {stages.map((s) => (
                <div key={s.stage}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm font-semibold text-slate-700">{s.stage}</span>
                    <span className="text-sm text-slate-500">
                      <span className="font-bold text-slate-800">{s.value.toLocaleString()}</span>
                      <span className="text-xs text-slate-400 ml-1.5">{s.pct}%</span>
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${Math.max(s.pct, 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex justify-between items-baseline mb-4">
            <h4 className="font-bold text-slate-800">Vistas de empleos por día</h4>
            <span className="text-xs text-slate-400">{viewsLoading ? '' : `${viewsTotal.toLocaleString()} en 30 días`}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={viewsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar name="Vistas" dataKey="vistas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* ===== Salud del scraper ===== */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Salud del scraper de empleos</h3>
          <p className="text-sm text-slate-500">Corridas de los últimos 30 días e inventario de ofertas activas</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi title="Tasa de éxito" value={scraperLoading ? '…' : `${stats.successRate}%`} icon={CheckCircle2} color="bg-emerald-500"
            tip="% de corridas del scraper que terminaron OK en los últimos 30 días." />
          <Kpi title="Corridas (30d)" value={scraperLoading ? '…' : stats.totalRuns} icon={Server} color="bg-primary-500"
            tip="Número de ejecuciones del scraper de empleos en los últimos 30 días." />
          <Kpi title="Ofertas activas" value={scraperLoading ? '…' : stats.activeJobs.toLocaleString()} icon={FileText} color="bg-primary-700"
            tip="Empleos externos (scrapeados) que están abiertos ahora mismo." />
          <Kpi title="Última corrida" value={scraperLoading ? '…' : relTime(stats.lastRunAt)} icon={Clock} color="bg-amber-500"
            tip="Cuándo se ejecutó el scraper por última vez." />
        </div>

        <Card>
          <h4 className="font-bold text-slate-800 mb-4">Empleos insertados por día</h4>
          {insertedTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={insertedTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="inserted" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm">Sin corridas registradas en el período.</p>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Estado por fuente */}
          <Card>
            <h4 className="font-bold text-slate-800 mb-4">Estado por fuente</h4>
            {bySource.length > 0 ? (
              <div className="space-y-3">
                {bySource.map((r) => (
                  <div key={r.source} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-700 text-sm truncate">{r.source}</p>
                      <p className="text-[11px] text-slate-400">{relTime(r.started_at)} · {r.jobs_inserted ?? 0} nuevos</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Sin datos de fuentes.</p>
            )}
          </Card>

          {/* Últimas corridas */}
          <Card>
            <h4 className="font-bold text-slate-800 mb-4">Últimas corridas</h4>
            {runs.length > 0 ? (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="px-2 py-2 font-bold">Fuente</th>
                      <th className="px-2 py-2 font-bold">Cuándo</th>
                      <th className="px-2 py-2 font-bold text-right">Nuevos</th>
                      <th className="px-2 py-2 font-bold text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {runs.map((r, i) => (
                      <tr key={i}>
                        <td className="px-2 py-2.5 font-medium text-slate-700">{r.source}</td>
                        <td className="px-2 py-2.5 text-slate-400 text-xs">{relTime(r.started_at)}</td>
                        <td className="px-2 py-2.5 text-right text-slate-600">{r.jobs_inserted ?? 0}</td>
                        <td className="px-2 py-2.5 text-center"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <AlertTriangle size={16} /> Sin corridas registradas.
              </div>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
