import React, { useState } from 'react';
import { useReports } from '../hooks/useReports';
import { AlertTriangle, CheckCircle, EyeOff, Ban, MessageSquareWarning, XCircle } from 'lucide-react';
import Pagination from './Pagination';
import ConfirmModal from './ConfirmModal';

// Etiquetas de tipo de entidad reportada
const ENTITY_META = {
  user:   { label: 'Perfil', cls: 'bg-purple-100 text-purple-700' },
  chamba: { label: 'Chamba', cls: 'bg-emerald-100 text-emerald-700' },
  job:    { label: 'Empleo', cls: 'bg-blue-100 text-blue-700' },
  alert:  { label: 'Alerta', cls: 'bg-amber-100 text-amber-700' },
};

// Motivos de ambos vocabularios (reports + alert_reports)
const REASON_LABELS = {
  fraud: 'Fraude o estafa', harassment: 'Acoso o insultos', spam: 'Spam o publicidad',
  fake: 'Perfil falso', inappropriate: 'Contenido inapropiado', other: 'Otro motivo',
  false: 'Falsa o inventada',
};

const RESOLUTION_LABELS = {
  dismissed: 'Descartado', content_removed: 'Contenido removido',
  user_banned: 'Usuario suspendido', warned: 'Advertido',
};

const ACTION_CFG = {
  dismiss:        { title: 'Descartar reporte', message: 'El reporte se marcará como descartado. No se toma ninguna acción.', confirmLabel: 'Descartar', confirmClass: 'bg-slate-700 hover:bg-slate-800 text-white' },
  remove_content: { title: 'Ocultar contenido', message: 'El contenido reportado dejará de mostrarse en la app y se avisará al usuario.', confirmLabel: 'Ocultar', confirmClass: 'bg-red-500 hover:bg-red-600 text-white' },
  ban_user:       { title: 'Suspender usuario', message: 'El usuario no podrá iniciar sesión y recibirá una notificación explicando el motivo.', confirmLabel: 'Suspender', confirmClass: 'bg-red-500 hover:bg-red-600 text-white' },
  warn:           { title: 'Advertir usuario', message: 'Se le enviará una advertencia de moderación al usuario (sin suspenderlo).', confirmLabel: 'Advertir', confirmClass: 'bg-amber-500 hover:bg-amber-600 text-white' },
};

const ENTITY_FILTERS = [
  { val: null, label: 'Todos' },
  { val: 'user', label: 'Perfiles' },
  { val: 'chamba', label: 'Chambas' },
  { val: 'job', label: 'Empleos' },
  { val: 'alert', label: 'Alertas' },
];

export default function ReportsView() {
  const [status, setStatus] = useState('pending');
  const [entityType, setEntityType] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, report: null, action: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const {
    reports, loading, isFetching, resolveReport,
    page, setPage, totalPages, total, pageSize,
  } = useReports(status, entityType);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  const openConfirm = (report, action) => setConfirmState({ open: true, report, action });
  const closeConfirm = () => setConfirmState({ open: false, report: null, action: null });

  const handleConfirm = async () => {
    const { report, action } = confirmState;
    if (!report) return;
    setActionLoading(true);
    try {
      await resolveReport(report.id, action, true);
      showToast('ok', 'Reporte resuelto.');
    } catch (e) {
      showToast('error', e?.message || 'No se pudo resolver el reporte.');
    } finally {
      setActionLoading(false);
      closeConfirm();
    }
  };

  const statusBtn = (val) => (
    `px-4 py-2 rounded-xl text-sm font-bold transition-all ${status === val ? 'bg-primary-500 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`
  );
  const typeBtn = (val) => (
    `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${entityType === val ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`
  );

  const cfg = confirmState.action ? ACTION_CFG[confirmState.action] : {};

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-slate-800'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header + filtros de estado */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reportes de Comunidad</h2>
          <p className="text-slate-500 text-sm mt-1">Modera perfiles, chambas, empleos y alertas denunciados por los usuarios.</p>
        </div>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button onClick={() => setStatus('pending')} className={statusBtn('pending')}>Pendientes</button>
          <button onClick={() => setStatus('resolved')} className={statusBtn('resolved')}>Resueltos</button>
          <button onClick={() => setStatus('dismissed')} className={statusBtn('dismissed')}>Descartados</button>
        </div>
      </div>

      {/* Filtro por tipo de entidad */}
      <div className="flex flex-wrap gap-2">
        {ENTITY_FILTERS.map((f) => (
          <button key={f.label} onClick={() => setEntityType(f.val)} className={typeBtn(f.val)}>{f.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-20 text-slate-400 italic">Cargando reportes...</div>
        ) : reports.length > 0 ? reports.map((report) => {
          const meta = ENTITY_META[report.entity_type] || { label: report.entity_type, cls: 'bg-slate-100 text-slate-600' };
          const isPending = report.status === 'pending';
          const canRemove = ['chamba', 'job', 'alert'].includes(report.entity_type);
          const canSanction = !!report.reported_user_id;
          return (
            <div key={report.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-start gap-5 hover:border-red-200 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle size={24} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${meta.cls}`}>{meta.label}</span>
                      {report.reported_user_banned && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-red-100 text-red-700">Baneado</span>
                      )}
                      {!isPending && report.resolution && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-slate-100 text-slate-600">{RESOLUTION_LABELS[report.resolution] || report.resolution}</span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg mt-1.5 truncate">{report.entity_title || 'Contenido eliminado'}</h3>
                    <p className="text-xs text-slate-400 mt-1 font-bold">
                      Denunciado por: <span className="text-slate-600">{report.reporter_name || '—'}</span>
                      {report.reported_user_name && (
                        <> · Responsable: <span className="text-slate-600">{report.reported_user_name}</span></>
                      )}
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest shrink-0">{new Date(report.created_at).toLocaleString()}</span>
                </div>

                <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-2">
                    Motivo: <span className="text-slate-700">{REASON_LABELS[report.reason] || report.reason}</span>
                  </p>
                  {report.description && <p className="text-sm text-slate-700 leading-relaxed italic">&ldquo;{report.description}&rdquo;</p>}
                </div>

                {isPending && (
                  <div className="flex justify-end gap-2 mt-6 flex-wrap">
                    <button onClick={() => openConfirm(report, 'dismiss')} className="flex items-center gap-2 px-4 py-2 text-slate-500 text-sm font-bold hover:bg-slate-100 rounded-xl transition-all">
                      <XCircle size={16} /> Descartar
                    </button>
                    {canSanction && (
                      <button onClick={() => openConfirm(report, 'warn')} className="flex items-center gap-2 px-4 py-2 text-amber-600 text-sm font-bold hover:bg-amber-50 rounded-xl transition-all">
                        <MessageSquareWarning size={16} /> Advertir
                      </button>
                    )}
                    {canRemove && (
                      <button onClick={() => openConfirm(report, 'remove_content')} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-all active:scale-95">
                        <EyeOff size={16} /> Ocultar
                      </button>
                    )}
                    {canSanction && !report.reported_user_banned && (
                      <button onClick={() => openConfirm(report, 'ban_user')} className="flex items-center gap-2 px-5 py-2 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-100 transition-all active:scale-95">
                        <Ban size={16} /> Suspender
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="bg-white p-20 rounded-3xl border border-slate-100 text-center">
            <div className="w-20 h-20 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Sin reportes</h3>
            <p className="text-slate-400 mt-2">No hay reportes {status === 'pending' ? 'pendientes' : status === 'resolved' ? 'resueltos' : 'descartados'} con este filtro.</p>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} isFetching={isFetching} />

      <ConfirmModal
        isOpen={confirmState.open}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        loading={actionLoading}
        title={cfg.title}
        message={cfg.message}
        confirmLabel={cfg.confirmLabel}
        confirmClass={cfg.confirmClass}
      />
    </div>
  );
}
