import React from 'react';
import { X, MapPin, Calendar, Building2, Tag, EyeOff, UserRound, Info } from 'lucide-react';
import { useReportedEntity } from '../hooks/useReports';
import ChambaDetailModal from './ChambaDetailModal';
import JobDetailModal from './JobDetailModal';
import UserDetailModal from './UserDetailModal';

// Abre el contenido reportado (perfil, chamba, empleo o alerta) trayéndolo por
// id. Es solo lectura: las acciones se toman desde la tarjeta del reporte.
export default function ReportedContentModal({ entityType, entityId, authorName, onClose }) {
  const { data, isLoading, error } = useReportedEntity(entityType, entityId);

  if (isLoading) return <Shell title="Contenido reportado" onClose={onClose}><p className="text-sm text-slate-400 italic">Cargando...</p></Shell>;
  if (error) return <Shell title="Contenido reportado" onClose={onClose}><p className="text-sm text-red-600">No se pudo cargar el contenido: {error.message}</p></Shell>;
  if (!data) return <Shell title="Contenido reportado" onClose={onClose}><p className="text-sm text-slate-500">Este contenido ya no existe (puede que su autor lo haya borrado).</p></Shell>;

  if (entityType === 'chamba') return <ChambaDetailModal chamba={data} onClose={onClose} readOnly />;
  if (entityType === 'job') return <JobDetailModal job={data} onClose={onClose} readOnly />;
  if (entityType === 'user') return <UserDetailModal user={data} onClose={onClose} />;
  return <AlertContent alert={data} authorName={authorName} onClose={onClose} />;
}

function Shell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between p-5 border-b border-slate-100 gap-3">
          <h2 className="font-bold text-slate-800 text-lg leading-snug min-w-0">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all shrink-0">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

// Las alertas no tienen modal de detalle propio en el panel.
function AlertContent({ alert, authorName, onClose }) {
  const images = (alert.images ?? []).filter(Boolean);
  const categories = Array.isArray(alert.category) ? alert.category : [];
  const chip = 'flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg';

  return (
    <Shell title={`Alerta ciudadana sobre ${alert.company_name || 'una empresa'}`} onClose={onClose}>
      <p className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed">
        <Info size={14} className="shrink-0 mt-0.5" />
        Esto es lo que un usuario publicó para avisar a otros sobre esta empresa. No lo escribió la empresa.
      </p>
      <div className="flex flex-wrap gap-2">
        {authorName && <span className={chip}><UserRound size={10} /> Publicada por {authorName}</span>}
        {alert.company_name && <span className={chip}><Building2 size={10} /> {alert.company_name}</span>}
        {alert.alert_type && <span className={chip}><Tag size={10} /> {alert.alert_type}</span>}
        {alert.city && <span className={chip}><MapPin size={10} /> {alert.city}</span>}
        {alert.created_at && <span className={chip}><Calendar size={10} /> {new Date(alert.created_at).toLocaleString('es-BO')}</span>}
        {alert.anonymous && <span className={chip}><EyeOff size={10} /> Publicada como anónima</span>}
        {categories.map((c) => <span key={c} className={chip}>{c}</span>)}
      </div>

      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <a key={i} href={src} target="_blank" rel="noreferrer" className="shrink-0">
              <img src={src} alt={`foto ${i + 1}`} className="h-28 w-28 object-cover rounded-xl border border-slate-100" />
            </a>
          ))}
        </div>
      )}

      {alert.description
        ? <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 rounded-xl p-4">{alert.description}</p>
        : <p className="text-sm text-slate-400 italic">Sin descripción.</p>}
    </Shell>
  );
}
