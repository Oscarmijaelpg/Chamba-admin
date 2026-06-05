import React, { useState } from 'react';
import {
  X, MapPin, Building2, User, Calendar, FileText,
  CheckCircle, XCircle, Trash2, Mail, DollarSign, Clock, Pencil, Save, AlertTriangle, Globe,
} from 'lucide-react';

const STATUS_COLOR = {
  open:           'bg-green-50 text-green-600 border-green-100',
  active:         'bg-green-50 text-green-600 border-green-100',
  closed:         'bg-red-50 text-red-500 border-red-100',
  expired:        'bg-slate-100 text-slate-500 border-slate-200',
  rejected:       'bg-red-50 text-red-500 border-red-100',
  pending:        'bg-amber-50 text-amber-600 border-amber-100',
  pending_review: 'bg-amber-50 text-amber-600 border-amber-100',
};
const STATUS_LABEL = {
  open: 'Abierto', active: 'Activo', closed: 'Cerrado', expired: 'Expirado',
  rejected: 'Rechazado', pending: 'Pendiente', pending_review: 'En revisión',
};
const STATUS_OPTIONS = ['open', 'active', 'closed', 'expired', 'rejected', 'pending', 'pending_review'];

const emptyToNull = (v) => (v === '' || v === undefined ? null : v);
const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

export default function JobDetailModal({ job, onClose, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  if (!job) return null;

  const isPublished = job.status === 'open' || job.status === 'active';
  const published = new Date(job.created_at).toLocaleDateString('es-BO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const startEdit = () => {
    setForm({
      title: job.title ?? '',
      company: job.company ?? '',
      city: job.city ?? '',
      status: job.status ?? 'open',
      salary_min: job.salary_min ?? '',
      salary_max: job.salary_max ?? '',
      description: job.description ?? '',
      requirements: job.requirements ?? '',
    });
    setEditing(true);
  };

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    const ok = await onUpdate(job.id, {
      title: form.title?.trim() || job.title,
      company: emptyToNull(form.company?.trim()),
      city: emptyToNull(form.city?.trim()),
      status: form.status,
      salary_min: numOrNull(form.salary_min),
      salary_max: numOrNull(form.salary_max),
      description: emptyToNull(form.description),
      requirements: emptyToNull(form.requirements),
    });
    setSaving(false);
    if (ok) setEditing(false);
  };

  const changeStatus = (status) => { onUpdate(job.id, { status }); onClose(); };

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
            <h2 className="font-bold text-slate-800 text-lg leading-snug">
              {editing ? 'Editar trabajo' : job.title}
            </h2>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_COLOR[job.status] ?? 'bg-slate-50 text-slate-400'}`}>
                {STATUS_LABEL[job.status] ?? job.status}
              </span>
              {job.is_external && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600">
                  <Globe size={11} /> Externo{job.source ? ` · ${job.source}` : ''}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {editing ? (
            <div className="space-y-4">
              <Field label="Título"><input className={inputCls} value={form.title} onChange={setField('title')} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Empresa"><input className={inputCls} value={form.company} onChange={setField('company')} /></Field>
                <Field label="Ciudad"><input className={inputCls} value={form.city} onChange={setField('city')} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Salario mín. (Bs.)"><input type="number" className={inputCls} value={form.salary_min} onChange={setField('salary_min')} /></Field>
                <Field label="Salario máx. (Bs.)"><input type="number" className={inputCls} value={form.salary_max} onChange={setField('salary_max')} /></Field>
              </div>
              <Field label="Estado">
                <select className={inputCls} value={form.status} onChange={setField('status')}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Descripción"><textarea rows={5} className={inputCls} value={form.description} onChange={setField('description')} /></Field>
              <Field label="Requisitos"><textarea rows={3} className={inputCls} value={form.requirements} onChange={setField('requirements')} /></Field>
            </div>
          ) : (
            <>
              {/* Motivo de rechazo */}
              {job.status === 'rejected' && job.rejection_reason && (
                <div className="flex gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Motivo de rechazo</p>
                    <p className="text-sm text-red-600 mt-0.5">{job.rejection_reason}</p>
                  </div>
                </div>
              )}

              {/* Metadatos */}
              <div className="grid grid-cols-2 gap-3">
                {job.company && <InfoCard icon={<Building2 size={14} />} label="Empresa" value={job.company} />}
                {job.employer?.full_name && <InfoCard icon={<User size={14} />} label="Publicado por" value={job.employer.full_name} />}
                {job.employer?.email && <InfoCard icon={<Mail size={14} />} label="Email empleador" value={job.employer.email} full />}
                {job.city && <InfoCard icon={<MapPin size={14} />} label="Ciudad" value={job.city} />}
                {(job.salary_min || job.salary_max) && (
                  <InfoCard
                    icon={<DollarSign size={14} />}
                    label="Salario"
                    value={`Bs. ${job.salary_min ?? '?'}${job.salary_max ? ` - ${job.salary_max}` : ''}`}
                  />
                )}
                <InfoCard icon={<Calendar size={14} />} label="Publicado" value={published} />
                {job.source_url && (
                  <a href={job.source_url} target="_blank" rel="noreferrer" className="col-span-2 bg-blue-50 rounded-xl p-3 hover:bg-blue-100 transition-all">
                    <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                      <Globe size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Fuente original</span>
                    </div>
                    <p className="text-sm font-semibold text-blue-600 truncate">{job.source_url}</p>
                  </a>
                )}
              </div>

              {/* Descripción */}
              {job.description && (
                <div>
                  <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                    <FileText size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Descripción</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 rounded-xl p-4">{job.description}</p>
                </div>
              )}

              {/* Requisitos */}
              {job.requirements && (
                <div>
                  <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                    <FileText size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Requisitos</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 rounded-xl p-4">{job.requirements}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer acciones */}
        <div className="p-5 border-t border-slate-100 space-y-3">
          {editing ? (
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-primary-500 text-white hover:bg-primary-600 transition-all disabled:opacity-50"
              >
                <Save size={17} /> {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {/* Aprobar / Cerrar */}
                {isPublished ? (
                  <button
                    onClick={() => changeStatus('closed')}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100 transition-all"
                  >
                    <XCircle size={17} /> Cerrar
                  </button>
                ) : (
                  <button
                    onClick={() => changeStatus('open')}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-green-50 text-green-600 hover:bg-green-100 border border-green-100 transition-all"
                  >
                    <CheckCircle size={17} /> Aprobar
                  </button>
                )}
                {/* Editar */}
                <button
                  onClick={startEdit}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition-all"
                >
                  <Pencil size={16} /> Editar
                </button>
              </div>
              {/* Eliminar */}
              <button
                onClick={() => { onDelete(job.id); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 transition-all"
              >
                <Trash2 size={17} /> Eliminar trabajo permanentemente
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</span>
      {children}
    </label>
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
