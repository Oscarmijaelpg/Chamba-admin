import React, { useState, useMemo } from 'react';
import { Search, MapPin, Building2, User, Calendar, Briefcase, ChevronRight, Globe, Home } from 'lucide-react';
import { useJobs } from '../hooks/useJobs';
import ConfirmModal from './ConfirmModal';
import JobDetailModal from './JobDetailModal';

const STATUS_COLOR = {
  open:   'bg-green-50 text-green-600',
  closed: 'bg-red-50 text-red-500',
  draft:  'bg-slate-100 text-slate-500',
};
const STATUS_LABEL = { open: 'Abierto', closed: 'Cerrado', draft: 'Borrador' };

function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${STATUS_COLOR[status] ?? 'bg-slate-50 text-slate-400'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// Distingue ofertas scrapeadas de sitios externos vs. publicadas dentro de la app.
function SourceBadge({ job }) {
  if (job.is_external) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 whitespace-nowrap">
        <Globe size={11} /> Externo{job.source ? ` · ${job.source}` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 whitespace-nowrap">
      <Home size={11} /> Propio
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

export default function JobsTable() {
  const { jobs, loading, updateStatus, deleteJob } = useJobs();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [cityFilter, setCity]       = useState('all');
  const [sourceFilter, setSource]   = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);
  const [confirm, setConfirm]         = useState({ open: false, id: null });
  const [actionLoading, setActionLoading] = useState(false);

  const cities = useMemo(() => {
    const set = new Set(jobs.map(j => j.city).filter(Boolean));
    return Array.from(set).sort();
  }, [jobs]);

  const metrics = useMemo(() => {
    const total = jobs.length;
    const external = jobs.filter(j => j.is_external).length;
    const own = total - external;
    return { total, external, own, externalPct: total ? Math.round((external / total) * 100) : 0 };
  }, [jobs]);

  const filtered = useMemo(() => jobs.filter(job => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !searchTerm ||
      job.title?.toLowerCase().includes(q) ||
      job.company?.toLowerCase().includes(q) ||
      job.employer?.full_name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchCity   = cityFilter === 'all'   || job.city === cityFilter;
    const matchSource = sourceFilter === 'all'
      || (sourceFilter === 'external' ? !!job.is_external : !job.is_external);
    return matchSearch && matchStatus && matchCity && matchSource;
  }), [jobs, searchTerm, statusFilter, cityFilter, sourceFilter]);

  const openDeleteConfirm = (id) => setConfirm({ open: true, id });
  const closeConfirm = () => setConfirm({ open: false, id: null });

  const handleDelete = async (idOverride) => {
    const id = idOverride ?? confirm.id;
    setActionLoading(true);
    await deleteJob(id);
    setActionLoading(false);
    closeConfirm();
  };

  const toggleStatus = (job) =>
    updateStatus(job.id, job.status === 'open' ? 'closed' : 'open');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Trabajos</h2>
        <p className="text-slate-400 text-sm mt-0.5">{filtered.length} de {jobs.length} trabajos</p>
      </div>

      {/* Métricas: externos vs propios */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Total trabajos" value={metrics.total} icon={Briefcase} color="bg-primary-600" />
        <Kpi title="Externos (scraper)" value={metrics.external} icon={Globe} color="bg-blue-500" sub={`${metrics.externalPct}% del total`} />
        <Kpi title="Propios (app)" value={metrics.own} icon={Home} color="bg-emerald-500" sub={`${100 - metrics.externalPct}% del total`} />
        <Kpi title="Mostrando" value={filtered.length} icon={Search} color="bg-amber-500" sub="con filtros actuales" />
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por título, empresa o empleador..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-0"
            value={sourceFilter}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="all">Todos los orígenes</option>
            <option value="external">Externos (scraper)</option>
            <option value="own">Propios (app)</option>
          </select>
          <select
            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-0"
            value={statusFilter}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="open">Abiertos</option>
            <option value="closed">Cerrados</option>
            <option value="draft">Borrador</option>
          </select>
          <select
            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-0"
            value={cityFilter}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="all">Todas las ciudades</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Loading / vacío */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
          <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando trabajos...</span>
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Briefcase size={40} className="text-slate-200" />
          <p className="text-sm font-medium text-slate-400">No hay trabajos con esos filtros</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          {/* MOBILE: cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(job => (
              <JobCard key={job.id} job={job} onOpen={() => setSelectedJob(job)} />
            ))}
          </div>

          {/* DESKTOP: tabla */}
          <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[680px]">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                    <th className="px-5 py-3.5">Trabajo</th>
                    <th className="px-5 py-3.5">Empresa / Empleador</th>
                    <th className="px-5 py-3.5">Origen</th>
                    <th className="px-5 py-3.5">Ciudad</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5">Fecha</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(job => (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className="hover:bg-slate-50/80 transition-all cursor-pointer"
                    >
                      <td className="px-5 py-3.5 max-w-[240px]">
                        <p className="font-semibold text-slate-800 truncate">{job.title}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{job.description?.substring(0, 50)}…</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-slate-700 font-medium truncate">{job.company || '-'}</p>
                        <p className="text-xs text-slate-400 truncate">{job.employer?.full_name || '-'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <SourceBadge job={job} />
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-1 text-sm text-slate-500">
                          <MapPin size={12} className="text-slate-300 shrink-0" />
                          {job.city || '-'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(job.created_at).toLocaleDateString('es-BO')}
                      </td>
                      <td className="px-5 py-3.5">
                        <ChevronRight size={16} className="text-slate-300 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal detalle */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onToggleStatus={(job) => { toggleStatus(job); setSelectedJob(null); }}
          onDelete={(id) => { openDeleteConfirm(id); setSelectedJob(null); }}
        />
      )}

      {/* Modal confirmar eliminar */}
      <ConfirmModal
        isOpen={confirm.open}
        onClose={closeConfirm}
        onConfirm={() => handleDelete()}
        loading={actionLoading}
        title="Eliminar trabajo"
        message="Esta acción no se puede deshacer. El trabajo será eliminado permanentemente."
        confirmLabel="Sí, eliminar"
      />
    </div>
  );
}

/* ── Card mobile ── */
function JobCard({ job, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 hover:border-primary-200 hover:shadow-md transition-all active:scale-[0.99]"
    >
      {/* Título + estado */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-800 leading-tight">{job.title}</p>
          {job.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {job.description}
            </p>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <StatusBadge status={job.status} />
          <ChevronRight size={14} className="text-slate-300" />
        </div>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-2">
        <SourceBadge job={job} />
        {job.company && (
          <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
            <Building2 size={10} /> {job.company}
          </span>
        )}
        {job.employer?.full_name && (
          <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
            <User size={10} /> {job.employer.full_name}
          </span>
        )}
        {job.city && (
          <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
            <MapPin size={10} /> {job.city}
          </span>
        )}
        <span className="flex items-center gap-1 text-[11px] text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
          <Calendar size={10} /> {new Date(job.created_at).toLocaleDateString('es-BO')}
        </span>
      </div>
    </button>
  );
}
