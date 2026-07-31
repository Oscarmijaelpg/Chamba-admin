import React, { useState } from 'react';
import { Search, MapPin, Briefcase, ChevronRight, ShieldCheck, Globe, User, Calendar, Coins, Loader2 } from 'lucide-react';
import { useChambas } from '../hooks/useChambas';
import ChambaDetailModal from './ChambaDetailModal';
import ConfirmModal from './ConfirmModal';
import Pagination from './Pagination';

const money = (n) => `Bs. ${Number(n ?? 0).toLocaleString('es-BO')}`;

const STATUS_COLOR = {
  open: 'bg-green-50 text-green-600', in_progress: 'bg-blue-50 text-blue-600',
  completed: 'bg-slate-100 text-slate-600', cancelled: 'bg-red-50 text-red-500', deleted: 'bg-slate-100 text-slate-400',
};
const STATUS_LABEL = {
  open: 'Abierta', in_progress: 'En progreso', completed: 'Finalizada', cancelled: 'Cancelada', deleted: 'Borrada',
};

function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${STATUS_COLOR[status] ?? 'bg-slate-50 text-slate-400'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function PayBadge({ chamba }) {
  return chamba.payment_method === 'internal' ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 whitespace-nowrap">
      <ShieldCheck size={11} /> Protegido
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 whitespace-nowrap">
      <Globe size={11} /> Externo
    </span>
  );
}

const Kpi = ({ title, value, icon: Icon, color, sub }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-start gap-2">
      <div className="min-w-0">
        <p className="text-slate-500 text-xs font-medium leading-tight">{title}</p>
        <h3 className="text-xl sm:text-2xl font-bold mt-1.5 text-slate-800 truncate">{value}</h3>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-xl shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
    </div>
  </div>
);

export default function ChambasTable() {
  const {
    chambas, loading, isFetching, updateChamba, deleteChamba, stats, cities,
    page, setPage, totalPages, pageTotal, pageSize,
    search, setSearch, status: statusFilter, setStatus, city: cityFilter, setCity,
  } = useChambas();

  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [actionLoading, setActionLoading] = useState(false);

  const handleDelete = async () => {
    setActionLoading(true);
    await deleteChamba(confirm.id);
    setActionLoading(false);
    setConfirm({ open: false, id: null });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Chambas</h2>
        <p className="text-slate-400 text-sm mt-0.5">{pageTotal.toLocaleString()} de {stats.total.toLocaleString()} chambas</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Total" value={stats.total} icon={Briefcase} color="bg-primary-600" sub={`${stats.completed} finalizadas`} />
        <Kpi title="Abiertas" value={stats.open} icon={Search} color="bg-green-500" />
        <Kpi title="En progreso" value={stats.in_progress} icon={Loader2} color="bg-blue-500" sub={`${stats.cancelled} canceladas`} />
        <Kpi title="En custodia" value={money(stats.escrow_held)} icon={Coins} color="bg-emerald-500" sub={`${stats.protected} con pago protegido`} />
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por título o descripción..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-0" value={statusFilter} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="open">Abiertas</option>
            <option value="in_progress">En progreso</option>
            <option value="completed">Finalizadas</option>
            <option value="cancelled">Canceladas</option>
            <option value="deleted">Borradas</option>
          </select>
          <select className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-0" value={cityFilter} onChange={(e) => setCity(e.target.value)}>
            <option value="all">Todas las ciudades</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Loading / vacío */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
          <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando chambas...</span>
        </div>
      )}
      {!loading && chambas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Briefcase size={40} className="text-slate-200" />
          <p className="text-sm font-medium text-slate-400">No hay chambas con esos filtros</p>
        </div>
      )}

      {!loading && chambas.length > 0 && (
        <>
          {/* MOBILE: cards */}
          <div className="md:hidden space-y-3">
            {chambas.map((c) => (
              <button key={c.id} onClick={() => setSelected(c)} className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 hover:border-primary-200 hover:shadow-md transition-all active:scale-[0.99]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 leading-tight truncate">{c.title}</p>
                    {c.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{c.description}</p>}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    <StatusBadge status={c.status} />
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <PayBadge chamba={c} />
                  <span className="text-sm font-black text-primary-600">{money(c.price_min)}</span>
                  {c.employer?.full_name && <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg"><User size={10} /> {c.employer.full_name}</span>}
                  {c.city && <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg"><MapPin size={10} /> {c.city}</span>}
                </div>
              </button>
            ))}
          </div>

          {/* DESKTOP: tabla */}
          <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[720px]">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                    <th className="px-5 py-3.5">Chamba</th>
                    <th className="px-5 py-3.5">Empleador</th>
                    <th className="px-5 py-3.5">Pago</th>
                    <th className="px-5 py-3.5">Precio</th>
                    <th className="px-5 py-3.5">Ciudad</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {chambas.map((c) => (
                    <tr key={c.id} onClick={() => setSelected(c)} className="hover:bg-slate-50/80 transition-all cursor-pointer">
                      <td className="px-5 py-3.5 max-w-[240px]">
                        <p className="font-semibold text-slate-800 truncate">{c.title}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{c.description?.substring(0, 50)}…</p>
                      </td>
                      <td className="px-5 py-3.5"><p className="text-sm text-slate-700 font-medium truncate">{c.employer?.full_name || '-'}</p></td>
                      <td className="px-5 py-3.5"><PayBadge chamba={c} /></td>
                      <td className="px-5 py-3.5 text-sm font-bold text-primary-600 whitespace-nowrap">{money(c.price_min)}</td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1 text-sm text-slate-500"><MapPin size={12} className="text-slate-300 shrink-0" /> {c.city || '-'}</span>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                      <td className="px-5 py-3.5"><ChevronRight size={16} className="text-slate-300 ml-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Pagination page={page} totalPages={totalPages} total={pageTotal} pageSize={pageSize} onPage={setPage} isFetching={isFetching} />

      {selected && (
        <ChambaDetailModal
          chamba={selected}
          onClose={() => setSelected(null)}
          onUpdate={updateChamba}
          onDelete={(id) => { setConfirm({ open: true, id }); setSelected(null); }}
        />
      )}

      <ConfirmModal
        isOpen={confirm.open}
        onClose={() => setConfirm({ open: false, id: null })}
        onConfirm={handleDelete}
        loading={actionLoading}
        title="Borrar chamba"
        message="La chamba dejará de mostrarse en la app (borrado lógico). No se pierde el historial de postulaciones ni pagos."
        confirmLabel="Sí, borrar"
      />
    </div>
  );
}
