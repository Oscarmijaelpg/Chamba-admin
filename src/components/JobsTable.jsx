import React, { useState, useMemo } from 'react';
import { Search, Trash2, CheckCircle, XCircle, MapPin, Building2, User, Calendar, Briefcase } from 'lucide-react';
import { useJobs } from '../hooks/useJobs';
import ConfirmModal from './ConfirmModal';

const STATUS_COLOR = {
  open:   'bg-green-50 text-green-600',
  closed: 'bg-red-50 text-red-600',
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

export default function JobsTable() {
  const { jobs, loading, updateStatus, deleteJob } = useJobs();
  const [searchTerm, setSearchTerm]   = useState('');
  const [statusFilter, setStatus]     = useState('all');
  const [cityFilter, setCity]         = useState('all');
  const [confirm, setConfirm]         = useState({ open: false, id: null });
  const [actionLoading, setActionLoading] = useState(false);

  // ciudades únicas del set de datos
  const cities = useMemo(() => {
    const set = new Set(jobs.map(j => j.city).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [jobs]);

  const filtered = useMemo(() => jobs.filter(job => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !searchTerm ||
      job.title?.toLowerCase().includes(q) ||
      job.company?.toLowerCase().includes(q) ||
      job.employer?.full_name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchCity   = cityFilter === 'all'   || job.city === cityFilter;
    return matchSearch && matchStatus && matchCity;
  }), [jobs, searchTerm, statusFilter, cityFilter]);

  const openDeleteConfirm = (id) => setConfirm({ open: true, id });
  const closeConfirm = () => setConfirm({ open: false, id: null });

  const handleDelete = async () => {
    setActionLoading(true);
    await deleteJob(confirm.id);
    setActionLoading(false);
    closeConfirm();
  };

  const toggleStatus = (job) =>
    updateStatus(job.id, job.status === 'open' ? 'closed' : 'open');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestión de Trabajos</h2>
          <p className="text-slate-400 text-sm mt-0.5">{filtered.length} de {jobs.length} trabajos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3">
        {/* Búsqueda */}
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

        {/* Selects en fila */}
        <div className="flex gap-3">
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
            {cities.filter(c => c !== 'all').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Estado vacío / cargando */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
          <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Cargando trabajos...</span>
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300">
          <Briefcase size={40} />
          <p className="text-sm font-medium text-slate-400">No hay trabajos con esos filtros</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          {/* MOBILE: cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onToggle={() => toggleStatus(job)}
                onDelete={() => openDeleteConfirm(job.id)}
              />
            ))}
          </div>

          {/* DESKTOP: tabla */}
          <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                    <th className="px-5 py-3.5">Trabajo</th>
                    <th className="px-5 py-3.5">Empresa / Empleador</th>
                    <th className="px-5 py-3.5">Ciudad</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5">Fecha</th>
                    <th className="px-5 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(job => (
                    <tr key={job.id} className="hover:bg-slate-50/60 transition-all">
                      <td className="px-5 py-3.5 max-w-[260px]">
                        <p className="font-semibold text-slate-800 truncate">{job.title}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{job.description?.substring(0, 55)}…</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-slate-700 font-medium">{job.company || '-'}</p>
                        <p className="text-xs text-slate-400">{job.employer?.full_name || '-'}</p>
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
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => toggleStatus(job)}
                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                            title={job.status === 'open' ? 'Cerrar trabajo' : 'Abrir trabajo'}
                          >
                            {job.status === 'open' ? <XCircle size={17} /> : <CheckCircle size={17} />}
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(job.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={confirm.open}
        onClose={closeConfirm}
        onConfirm={handleDelete}
        loading={actionLoading}
        title="Eliminar trabajo"
        message="Esta acción no se puede deshacer. El trabajo será eliminado permanentemente."
        confirmLabel="Sí, eliminar"
      />
    </div>
  );
}

/* ── Card mobile ── */
function JobCard({ job, onToggle, onDelete }) {
  const isOpen = job.status === 'open';
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      {/* Título + estado */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-800 leading-tight truncate">{job.title}</p>
          {job.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {job.description}
            </p>
          )}
        </div>
        <StatusBadge status={job.status} />
      </div>

      {/* Chips de info */}
      <div className="flex flex-wrap gap-2">
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

      {/* Acciones */}
      <div className="flex gap-2 pt-1 border-t border-slate-50">
        <button
          onClick={onToggle}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            isOpen
              ? 'bg-red-50 text-red-500 hover:bg-red-100'
              : 'bg-green-50 text-green-600 hover:bg-green-100'
          }`}
        >
          {isOpen ? <><XCircle size={13} /> Cerrar</> : <><CheckCircle size={13} /> Abrir</>}
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl text-xs font-bold transition-all"
        >
          <Trash2 size={13} /> Eliminar
        </button>
      </div>
    </div>
  );
}
