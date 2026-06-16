import React from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import {
  MapPin, Eye, Search, Repeat, Users, Building2, Layers, TrendingUp, Ruler, AlertTriangle,
  Tag, Bell, Heart,
} from 'lucide-react';
import { useGeoAnalytics } from '../hooks/useGeoAnalytics';
import { useUsageIntensity } from '../hooks/useUsageIntensity';
import { useSearchInsights } from '../hooks/useSearchInsights';
import { useSupplyAnalytics } from '../hooks/useSupplyAnalytics';
import { usePreferenceAnalytics } from '../hooks/usePreferenceAnalytics';
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

const PALETTE = ['#3B82F6', '#1BF28E', '#00A855', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function PlatformInsights() {
  const geo = useGeoAnalytics();
  const usage = useUsageIntensity();
  const search = useSearchInsights(30);
  const supply = useSupplyAnalytics(30);
  const prefs = usePreferenceAnalytics();

  const usersByCity = geo.byCity.filter((c) => c.city !== 'Sin ciudad');
  const topCategories = supply.byCategory.slice(0, 12);
  const topPreferences = prefs.byCategory.slice(0, 12);

  return (
    <div className="space-y-10">
      {/* ===================== GEOGRAFÍA ===================== */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Geografía: usuarios vs oferta</h3>
          <p className="text-sm text-slate-500">Dónde están tus usuarios y dónde está la oferta de empleos abierta.</p>
        </div>

        {/* Insight de descompensación */}
        {!geo.loading && geo.gap && geo.gap.deficit > 0 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-bold">{geo.gap.city}</span> concentra{' '}
              <span className="font-bold">{geo.gap.usuarios}</span> usuarios pero solo tiene{' '}
              <span className="font-bold">{geo.gap.empleos}</span> empleos abiertos: hay demanda sin oferta.
              Conviene reforzar el scraper o publicar empleos ahí.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin size={16} className="text-primary-500" /> Usuarios por ciudad
            </h4>
            <ResponsiveContainer width="100%" height={Math.max(220, usersByCity.length * 34)}>
              <BarChart data={usersByCity} layout="vertical" margin={{ left: 12, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="city" width={78} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v, _n, p) => [`${v} usuarios (${p.payload.pct}%)`, p.payload.city]} />
                <Bar dataKey="users" radius={[0, 6, 6, 0]}>
                  {usersByCity.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Building2 size={16} className="text-primary-500" /> Oferta vs demanda por ciudad
              <InfoTip text="Compara usuarios registrados (demanda) con empleos abiertos (oferta) en cada ciudad. Barras muy dispares = descompensación." />
            </h4>
            <p className="text-xs text-slate-400 mb-4">Usuarios registrados vs empleos abiertos</p>
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
        </div>
      </section>

      {/* ===================== INTENSIDAD DE USO ===================== */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Intensidad de uso</h3>
          <p className="text-sm text-slate-500">Cuánto consume cada usuario activo (últimos 30 días).</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi title="Vistas por usuario activo/día" value={usage.loading ? '…' : usage.viewsPerActiveUserPerDay}
            icon={Eye} color="bg-primary-500"
            tip="Total de vistas de empleos ÷ suma de usuarios activos de cada día. En promedio, cuántos empleos abre un usuario en un día activo." />
          <Kpi title="Vistas por usuario activo (mes)" value={usage.loading ? '…' : usage.viewsPerActiveUser}
            icon={TrendingUp} color="bg-blue-500" sub={usage.loading ? '' : `${usage.views30.toLocaleString()} vistas`}
            tip="Total de vistas de empleos en 30 días ÷ usuarios activos del mes." />
          <Kpi title="Búsquedas por usuario activo" value={usage.loading ? '…' : usage.searchesPerActiveUser}
            icon={Search} color="bg-amber-500" sub={usage.loading ? '' : `${usage.searches30.toLocaleString()} búsquedas`}
            tip="Búsquedas en 30 días ÷ usuarios activos del mes." />
          <Kpi title="Activos del mes (MAU)" value={usage.loading ? '…' : usage.mau.toLocaleString()}
            icon={Repeat} color="bg-primary-700"
            tip="Usuarios distintos con alguna actividad en los últimos 30 días." />
        </div>
      </section>

      {/* ===================== BÚSQUEDA E INTENCIÓN ===================== */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Búsqueda e intención</h3>
          <p className="text-sm text-slate-500">Qué tanto buscan los usuarios y en qué pestaña (últimos 30 días).</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi title="Búsquedas (30d)" value={search.loading ? '…' : search.total.toLocaleString()} icon={Search} color="bg-primary-500" />
          <Kpi title="Longitud promedio" value={search.loading ? '…' : `${search.avgLen} car.`} icon={Ruler} color="bg-blue-500"
            tip="Promedio de caracteres por término buscado. (No guardamos el texto de la búsqueda, solo su longitud.)" />
          <Kpi title="Vistas por búsqueda" value={search.loading ? '…' : search.viewsPerSearch} icon={Eye} color="bg-emerald-500"
            tip="Vistas de empleos ÷ búsquedas. Cuántos empleos abre la gente por cada búsqueda que hace." />
          <Kpi title="En pestaña Empleos" value={search.loading ? '…' : (search.byTab.find((t) => t.tab === 'jobs')?.n ?? 0).toLocaleString()}
            icon={Layers} color="bg-amber-500" sub="del total de búsquedas" />
        </div>

        <Card>
          <h4 className="font-bold text-slate-800 mb-4">Búsquedas por día</h4>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={search.perDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" name="Búsquedas" dataKey="busquedas" stroke="#3B82F6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </section>

      {/* ===================== OFERTA DE EMPLEOS ===================== */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Oferta de empleos</h3>
          <p className="text-sm text-slate-500">Composición del inventario de empleos abiertos y oferta vs demanda diaria.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-primary-500" /> Empleos abiertos por fuente
            </h4>
            {supply.bySource.length > 0 ? (
              <div className="space-y-3">
                {supply.bySource.map((s, i) => {
                  const max = supply.bySource[0]?.jobs || 1;
                  return (
                    <div key={s.source}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-sm font-semibold text-slate-700">{s.source}</span>
                        <span className="text-sm font-bold text-slate-800">{s.jobs.toLocaleString()}</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(s.jobs / max) * 100}%`, backgroundColor: PALETTE[i % PALETTE.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Sin empleos abiertos.</p>
            )}
          </Card>

          <Card>
            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Layers size={16} className="text-primary-500" /> Top categorías (empleos abiertos)
            </h4>
            <ResponsiveContainer width="100%" height={Math.max(220, topCategories.length * 26)}>
              <BarChart data={topCategories} layout="vertical" margin={{ left: 12, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={130} tick={{ fontSize: 10 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => [`${v} empleos`, 'Abiertos']} />
                <Bar dataKey="jobs" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <Card>
          <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
            Oferta vs demanda por día
            <InfoTip text="Empleos nuevos publicados (oferta) frente a vistas de empleos (demanda) cada día. Si la demanda crece más rápido que la oferta, falta inventario." />
          </h4>
          <p className="text-xs text-slate-400 mb-4">Empleos nuevos vs vistas de empleos</p>
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
      </section>

      {/* ===================== PREFERENCIAS / DEMANDA ===================== */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Preferencias de categorías</h3>
          <p className="text-sm text-slate-500">Qué tipo de empleos guarda más la gente como preferencia (onboarding y alertas).</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi title="Usuarios con preferencias" value={prefs.loading ? '…' : prefs.totalUsers.toLocaleString()}
            icon={Heart} color="bg-pink-500"
            tip="Usuarios que guardaron al menos una categoría como preferencia." />
          <Kpi title="Con alertas activas" value={prefs.loading ? '…' : prefs.notifyUsers.toLocaleString()}
            icon={Bell} color="bg-primary-500"
            sub={prefs.loading || prefs.totalUsers === 0 ? '' : `${Math.round((prefs.notifyUsers / prefs.totalUsers) * 100)}% de los que tienen preferencias`}
            tip="Usuarios con preferencias que además activaron las notificaciones de nuevas chambas." />
          <Kpi title="Categoría más buscada" value={prefs.loading ? '…' : (topPreferences[0]?.label ?? '—')}
            icon={Tag} color="bg-violet-500"
            sub={prefs.loading || !topPreferences[0] ? '' : `${topPreferences[0].pct}% de los usuarios`} />
          <Kpi title="Categorías distintas" value={prefs.loading ? '…' : prefs.byCategory.length}
            icon={Layers} color="bg-amber-500" sub="con al menos un interesado" />
        </div>

        <Card>
          <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Tag size={16} className="text-primary-500" /> Top categorías guardadas como preferencia
            <InfoTip text="Cuántos usuarios guardaron cada categoría como preferencia. Compáralo con la oferta de empleos: una categoría muy deseada pero con poca oferta abierta es una oportunidad de inventario." />
          </h4>
          <p className="text-xs text-slate-400 mb-4">Usuarios interesados por categoría (% sobre los que guardaron preferencias)</p>
          {topPreferences.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(220, topPreferences.length * 30)}>
              <BarChart data={topPreferences} layout="vertical" margin={{ left: 12, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 10 }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v, _n, p) => [`${v} usuarios (${p.payload.pct}%)`, 'Interesados']} />
                <Bar dataKey="users" fill="#EC4899" radius={[0, 4, 4, 0]}>
                  {topPreferences.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm">Aún no hay preferencias guardadas.</p>
          )}
        </Card>
      </section>
    </div>
  );
}
