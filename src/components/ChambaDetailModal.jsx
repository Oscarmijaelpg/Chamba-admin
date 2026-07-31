import React, { useState } from 'react';
import {
  X, MapPin, User, Mail, Calendar, FileText, DollarSign,
  ShieldCheck, Globe, Pencil, Save, Trash2, CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react';

const STATUS_COLOR = {
  open:        'bg-green-50 text-green-600 border-green-100',
  in_progress: 'bg-blue-50 text-blue-600 border-blue-100',
  completed:   'bg-slate-100 text-slate-600 border-slate-200',
  cancelled:   'bg-red-50 text-red-500 border-red-100',
  deleted:     'bg-slate-100 text-slate-400 border-slate-200',
};
const STATUS_LABEL = {
  open: 'Abierta', in_progress: 'En progreso', completed: 'Finalizada', cancelled: 'Cancelada', deleted: 'Borrada',
};
const STATUS_OPTIONS = ['open', 'in_progress', 'completed', 'cancelled', 'deleted'];

const emptyToNull = (v) => (v === '' || v === undefined ? null : v);
const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

export default function ChambaDetailModal({ chamba, onClose, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  if (!chamba) return null;

  const isInternal = chamba.payment_method === 'internal';
  const published = new Date(chamba.created_at).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' });
  const images = (chamba.images ?? []).filter(Boolean);

  const startEdit = () => {
    setForm({
      title: chamba.title ?? '',
      city: chamba.city ?? '',
      status: chamba.status ?? 'open',
      price_min: chamba.price_min ?? '',
      description: chamba.description ?? '',
    });
    setEditing(true);
  };
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    const ok = await onUpdate(chamba.id, {
      title: form.title?.trim() || chamba.title,
      city: emptyToNull(form.city?.trim()),
      status: form.status,
      price_min: numOrNull(form.price_min),
      description: emptyToNull(form.description),
    });
    setSaving(false);
    if (ok) setEditing(false);
  };

  const changeStatus = (status) => { onUpdate(chamba.id, { status }); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-2 pb-4 sm:p-5 border-b border-slate-100 gap-3">
          <div className="min-w-0">
            <h2 className="font-bold text-slate-800 text-lg leading-snug">{editing ? 'Editar chamba' : chamba.title}</h2>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_COLOR[chamba.status] ?? 'bg-slate-50 text-slate-400'}`}>
                {STATUS_LABEL[chamba.status] ?? chamba.status}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isInternal ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                {isInternal ? <><ShieldCheck size={11} /> Pago protegido</> : <><Globe size={11} /> Pago externo</>}
              </span>
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
                <Field label="Ciudad"><input className={inputCls} value={form.city} onChange={setField('city')} /></Field>
                <Field label="Precio (Bs.)"><input type="number" className={inputCls} value={form.price_min} onChange={setField('price_min')} /></Field>
              </div>
              <Field label="Estado">
                <select className={inputCls} value={form.status} onChange={setField('status')}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Descripción"><textarea rows={5} className={inputCls} value={form.description} onChange={setField('description')} /></Field>
            </div>
          ) : (
            <>
              {isInternal && (
                <div className="flex gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Esta chamba tiene <b>pago en custodia</b>. Cambiar el estado a mano <b>no mueve el dinero</b> — para liberar, devolver o dividir usá la sección <b>Disputas</b>.
                  </p>
                </div>
              )}

              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((src, i) => (
                    <img key={i} src={src} alt={`foto ${i + 1}`} className="h-28 w-28 object-cover rounded-xl border border-slate-100 shrink-0" />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {chamba.employer?.full_name && <InfoCard icon={<User size={14} />} label="Publicado por" value={chamba.employer.full_name} />}
                {chamba.employer?.email && <InfoCard icon={<Mail size={14} />} label="Email empleador" value={chamba.employer.email} full />}
                <InfoCard icon={<MapPin size={14} />} label="Ciudad" value={`${chamba.city || '-'}${chamba.is_virtual ? ' (Virtual)' : ''}`} />
                <InfoCard icon={<DollarSign size={14} />} label="Precio" value={`Bs. ${chamba.price_min ?? '?'}${chamba.price_max ? ` - ${chamba.price_max}` : ''}`} />
                <InfoCard icon={<Calendar size={14} />} label="Publicada" value={published} />
              </div>

              {chamba.cancel_reason && (
                <div className="flex gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Motivo de cancelación</p>
                    <p className="text-sm text-red-600 mt-0.5">{chamba.cancel_reason}</p>
                  </div>
                </div>
              )}

              {chamba.description && (
                <div>
                  <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                    <FileText size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Descripción</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 rounded-xl p-4">{chamba.description}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer acciones */}
        <div className="p-5 border-t border-slate-100 space-y-3">
          {editing ? (
            <div className="flex gap-3">
              <button onClick={() => setEditing(false)} disabled={saving} className="flex-1 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all disabled:opacity-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-primary-500 text-white hover:bg-primary-600 transition-all disabled:opacity-50">
                <Save size={17} /> {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {chamba.status === 'open' ? (
                  <button onClick={() => changeStatus('cancelled')} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100 transition-all">
                    <XCircle size={17} /> Cancelar
                  </button>
                ) : (
                  <button onClick={() => changeStatus('open')} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-green-50 text-green-600 hover:bg-green-100 border border-green-100 transition-all">
                    <CheckCircle size={17} /> Reabrir
                  </button>
                )}
                <button onClick={startEdit} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition-all">
                  <Pencil size={16} /> Editar
                </button>
              </div>
              <button onClick={() => { onDelete(chamba.id); onClose(); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 transition-all">
                <Trash2 size={17} /> Borrar chamba
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
