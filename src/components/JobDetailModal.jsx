import React from 'react';
import {
  X, MapPin, Building2, User, Calendar, FileText,
  CheckCircle, XCircle, Trash2, Mail, DollarSign, Clock
} from 'lucide-react';

const STATUS_COLOR = {
  open:   'bg-green-50 text-green-600 border-green-100',
  closed: 'bg-red-50 text-red-500 border-red-100',
  draft:  'bg-slate-100 text-slate-500 border-slate-200',
};
const STATUS_LABEL = { open: 'Abierto', closed: 'Cerrado', draft: 'Borrador' };

export default function JobDetailModal({ job, onClose, onToggleStatus, onDelete }) {
  if (!job) return null;

  const isOpen = job.status === 'open';
  const published = new Date(job.created_at).toLocaleDateString('es-BO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Handle mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-2 pb-4 sm:p-5 border-b border-slate-100 gap-3">
          <div className="min-w-0">
            <h2 className="font-bold text-slate-800 text-lg leading-snug">{job.title}</h2>
            <div className="mt-1.5">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_COLOR[job.status] ?? 'bg-slate-50 text-slate-400'}`}>
                {STATUS_LABEL[job.status] ?? job.status}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Metadatos */}
          <div className="grid grid-cols-2 gap-3">
            {job.company && (
              <InfoCard icon={<Building2 size={14} />} label="Empresa" value={job.company} />
            )}
            {job.employer?.full_name && (
              <InfoCard icon={<User size={14} />} label="Publicado por" value={job.employer.full_name} />
            )}
            {job.employer?.email && (
              <InfoCard icon={<Mail size={14} />} label="Email empleador" value={job.employer.email} full />
            )}
            {job.city && (
              <InfoCard icon={<MapPin size={14} />} label="Ciudad" value={job.city} />
            )}
            {(job.salary || job.salary_min || job.price_min) && (
              <InfoCard
                icon={<DollarSign size={14} />}
                label="Salario / Presupuesto"
                value={`Bs. ${job.salary ?? job.salary_min ?? job.price_min}`}
              />
            )}
            <InfoCard icon={<Calendar size={14} />} label="Publicado" value={published} />
            {job.deadline && (
              <InfoCard
                icon={<Clock size={14} />}
                label="Vence"
                value={new Date(job.deadline).toLocaleDateString('es-BO')}
              />
            )}
          </div>

          {/* Descripción completa */}
          {job.description && (
            <div>
              <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                <FileText size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Descripción</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 rounded-xl p-4">
                {job.description}
              </p>
            </div>
          )}

          {/* Requisitos si existen */}
          {job.requirements && (
            <div>
              <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                <FileText size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Requisitos</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 rounded-xl p-4">
                {job.requirements}
              </p>
            </div>
          )}
        </div>

        {/* Footer acciones */}
        <div className="p-5 border-t border-slate-100 space-y-3">
          {/* Toggle estado */}
          <button
            onClick={() => { onToggleStatus(job); onClose(); }}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
              isOpen
                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100'
                : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-100'
            }`}
          >
            {isOpen
              ? <><XCircle size={17} /> Cerrar oferta (deja de mostrarse en la app)</>
              : <><CheckCircle size={17} /> Publicar oferta (vuelve a aparecer en la app)</>
            }
          </button>

          {/* Eliminar */}
          <button
            onClick={() => { onDelete(job.id); onClose(); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 transition-all"
          >
            <Trash2 size={17} /> Eliminar trabajo permanentemente
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, full }) {
  return (
    <div className={`bg-slate-50 rounded-xl p-3 ${full ? 'col-span-2' : ''}`}>
      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-700 truncate">{value}</p>
    </div>
  );
}
