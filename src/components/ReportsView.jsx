import React, { useState } from 'react';
import { useReports } from '../hooks/useReports';
import { useModerationDialog } from '../hooks/useModeration';
import {
  CheckCircle, EyeOff, Ban, MessageSquareWarning, XCircle, Eye, UserRound, RotateCcw,
  Flag, MapPin, Calendar, Briefcase, Wrench, Megaphone, Info,
} from 'lucide-react';
import Pagination from './Pagination';
import ModerationActionModal from './ModerationActionModal';
import ReportedContentModal from './ReportedContentModal';

// Qué es cada cosa que se puede reportar. `noun` arma las frases de la tarjeta.
const ENTITY_META = {
  user:   { label: 'Perfil', noun: 'el perfil', icon: UserRound, cls: 'bg-purple-100 text-purple-700', tile: 'bg-purple-50 text-purple-600' },
  chamba: { label: 'Chamba', noun: 'la chamba', icon: Wrench, cls: 'bg-emerald-100 text-emerald-700', tile: 'bg-emerald-50 text-emerald-600' },
  job:    { label: 'Empleo', noun: 'el empleo', icon: Briefcase, cls: 'bg-blue-100 text-blue-700', tile: 'bg-blue-50 text-blue-600' },
  alert:  { label: 'Alerta ciudadana', noun: 'la alerta', icon: Megaphone, cls: 'bg-amber-100 text-amber-700', tile: 'bg-amber-50 text-amber-600' },
};

// Motivos de ambos vocabularios (reports + alert_reports)
const REASON_LABELS = {
  fraud: 'Fraude o estafa', harassment: 'Acoso o insultos', spam: 'Spam o publicidad',
  fake: 'Perfil falso', inappropriate: 'Contenido inapropiado', other: 'Otro motivo',
  false: 'Falsa o inventada',
};

// Qué se hizo al resolver, dicho en una frase.
const OUTCOME = {
  dismissed:       { text: 'Se descartó el reporte: no se tomó ninguna medida.', cls: 'bg-slate-50 border-slate-200 text-slate-600' },
  content_removed: { text: 'Se eliminó la publicación.', cls: 'bg-slate-50 border-slate-200 text-slate-700' },
  user_banned:     { text: 'Se suspendió la cuenta de quien publicó.', cls: 'bg-red-50 border-red-100 text-red-700' },
  warned:          { text: 'Se le envió una advertencia a quien publicó.', cls: 'bg-amber-50 border-amber-100 text-amber-700' },
};

// Acción del reporte (admin_resolve_report) → acción que explica el modal.
const MODAL_ACTION = { dismiss: 'dismiss', remove_content: 'remove_content', ban_user: 'ban', warn: 'warn' };

// Resolver un reporte cierra todos los pendientes del mismo contenido.
const closesNote = (report) => {
  const what = report.entity_type === 'user' ? 'este mismo perfil' : 'esta misma publicación';
  const n = Number(report.same_entity_count) || 0;
  return `Resolver cierra todos los reportes pendientes de ${what}${n > 1 ? ` (son ${n})` : ''}.`;
};

// Una alerta es la denuncia de un usuario sobre una empresa: quien la publicó es
// quien avisa, no la empresa denunciada. Se aclara antes de sancionar.
const ALERT_WARNING = 'Ojo: una alerta ciudadana es la denuncia de un usuario sobre una empresa. Quien la publicó es la persona que avisa, no la empresa denunciada.';

const ENTITY_FILTERS = [
  { val: null, label: 'Todos' },
  { val: 'user', label: 'Perfiles' },
  { val: 'chamba', label: 'Chambas' },
  { val: 'job', label: 'Empleos' },
  { val: 'alert', label: 'Alertas' },
];

const fmtDate = (d) => (d ? new Date(d).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) : '');

export default function ReportsView() {
  const [status, setStatus] = useState('pending');
  const [entityType, setEntityType] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, report: null, action: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [viewing, setViewing] = useState(null); // { entityType, entityId, authorName }
  const [toast, setToast] = useState(null);

  const {
    reports, loading, isFetching, resolveReport,
    page, setPage, totalPages, total, pageSize,
  } = useReports(status, entityType);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 5000); };

  // Reactivar una cuenta suspendida (moderación directa sobre el usuario).
  const unbanDialog = useModerationDialog({ onDone: (msg) => showToast('ok', msg) });

  const openConfirm = (report, action) => { setActionError(null); setConfirmState({ open: true, report, action }); };
  const closeConfirm = () => { if (!actionLoading) setConfirmState({ open: false, report: null, action: null }); };

  // Si falla, el modal queda abierto mostrando el motivo.
  const handleConfirm = async ({ message, notify }) => {
    const { report, action } = confirmState;
    if (!report) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await resolveReport(report.id, action, { notify, message });
      setConfirmState({ open: false, report: null, action: null });
      const where = action === 'dismiss' ? 'Descartados' : 'Resueltos';
      const undo = action === 'ban_user' ? ' Desde ahí podés reactivar la cuenta.' : '';
      showToast('ok', `${res?.closed > 1 ? `Se cerraron ${res.closed} reportes.` : 'Reporte resuelto.'} Quedó en «${where}».${undo}`);
    } catch (e) {
      setActionError(e?.message || 'No se pudo resolver el reporte.');
    } finally {
      setActionLoading(false);
    }
  };

  const statusBtn = (val) => (
    `px-4 py-2 rounded-xl text-sm font-bold transition-all ${status === val ? 'bg-primary-500 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`
  );
  const typeBtn = (val) => (
    `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${entityType === val ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`
  );

  const confirmReport = confirmState.report;
  const confirmSanctionsAlertAuthor = confirmReport?.entity_type === 'alert' && ['ban_user', 'warn'].includes(confirmState.action);

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
          <p className="text-slate-500 text-sm mt-1">Lo que los usuarios denunciaron. En cada tarjeta ves la publicación original, quién la hizo y quién la reportó.</p>
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
        ) : reports.length > 0 ? reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onView={setViewing}
            onAction={openConfirm}
            onUnban={() => unbanDialog.open({
              action: 'unban', entityType: 'user', entityId: report.reported_user_id,
              targetName: report.reported_user_name,
            })}
          />
        )) : (
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

      {viewing && (
        <ReportedContentModal
          entityType={viewing.entityType}
          entityId={viewing.entityId}
          authorName={viewing.authorName}
          onClose={() => setViewing(null)}
        />
      )}

      <ModerationActionModal
        isOpen={confirmState.open}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        loading={actionLoading}
        error={actionError}
        action={MODAL_ACTION[confirmState.action]}
        entityType={confirmReport?.entity_type}
        targetName={confirmReport?.reported_user_name}
        contentTitle={confirmReport?.entity_type === 'user' ? null : confirmReport?.entity_title}
        warning={confirmSanctionsAlertAuthor ? ALERT_WARNING : null}
        note={confirmReport ? closesNote(confirmReport) : null}
        notifyLabel={confirmState.action === 'dismiss' ? 'Avisar a quienes reportaron' : 'Notificar al usuario y a quienes reportaron'}
      />

      <ModerationActionModal {...unbanDialog.dialogProps} />
    </div>
  );
}

function ReportCard({ report, onView, onAction, onUnban }) {
  const meta = ENTITY_META[report.entity_type] || { label: report.entity_type, noun: 'el contenido', icon: Flag, cls: 'bg-slate-100 text-slate-600', tile: 'bg-slate-100 text-slate-500' };
  const Icon = meta.icon;
  const isPending = report.status === 'pending';
  const isUser = report.entity_type === 'user';
  const isAlert = report.entity_type === 'alert';
  const canRemove = ['chamba', 'job', 'alert'].includes(report.entity_type);
  const canSanction = !!report.reported_user_id;
  const banned = !!report.reported_user_banned;
  // `entity_exists` llega de la RPC; si no viene, se asume que existe.
  const exists = report.entity_exists !== false;
  const sameCount = Number(report.same_entity_count) || 0;
  const priorActions = Number(report.user_prior_actions) || 0;
  const outcome = OUTCOME[report.resolution];
  // Se había suspendido por este reporte y después se reactivó la cuenta.
  const banLifted = report.resolution === 'user_banned' && !banned;
  const author = report.reported_user_name || (report.entity_type === 'job' && !report.reported_user_id ? 'Empleo traído por el scraper (sin cuenta)' : '—');

  return (
    <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
      {/* Qué se reportó */}
      <div className="flex items-start gap-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${meta.tile}`}>
          <Icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${meta.cls}`}>{meta.label}</span>
            {isPending && sameCount > 1 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-orange-100 text-orange-700">{sameCount} reportes iguales</span>
            )}
            {!exists && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-slate-100 text-slate-500">Ya no existe</span>
            )}
            <span className="ml-auto text-[11px] font-semibold text-slate-400 shrink-0">Reportado el {fmtDate(report.created_at)}</span>
          </div>
          <h3 className="font-bold text-slate-800 text-lg mt-1.5 break-words">{report.entity_title || 'Contenido eliminado'}</h3>
        </div>
      </div>

      {/* La publicación original */}
      {!isUser && (
        <div className="mt-4 rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500">
            <span className="uppercase tracking-wide text-slate-400">Publicación original</span>
            {report.entity_city && <span className="flex items-center gap-1"><MapPin size={11} /> {report.entity_city}</span>}
            {report.entity_created_at && <span className="flex items-center gap-1"><Calendar size={11} /> {fmtDate(report.entity_created_at)}</span>}
            {report.entity_anonymous && <span className="flex items-center gap-1"><EyeOff size={11} /> Se muestra como anónima</span>}
          </div>
          <div className="px-4 py-3">
            {exists ? (
              report.entity_description
                ? <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line line-clamp-5">{report.entity_description}</p>
                : <p className="text-sm text-slate-400 italic">Sin descripción.</p>
            ) : (
              <p className="text-sm text-slate-400 italic">La publicación ya fue eliminada.</p>
            )}
            {isAlert && (
              <p className="flex items-start gap-1.5 mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed">
                <Info size={14} className="shrink-0 mt-0.5" />
                Una alerta es la denuncia de un usuario sobre una empresa. Quien la publicó es quien avisa, no la empresa denunciada.
              </p>
            )}
            {exists && (
              <button onClick={() => onView({ entityType: report.entity_type, entityId: report.entity_id, authorName: report.reported_user_name })} className="flex items-center gap-1.5 mt-3 text-primary-600 text-xs font-bold hover:underline">
                <Eye size={14} /> Ver la publicación completa
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quién publicó y quién reportó */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div className="rounded-2xl border border-slate-200 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{isUser ? 'Perfil reportado' : 'Publicado por'}</p>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <span className="text-sm font-bold text-slate-800">{author}</span>
            {banned && <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-red-100 text-red-700">Cuenta suspendida</span>}
            {priorActions > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-slate-100 text-slate-600">
                {priorActions} {priorActions === 1 ? 'sanción' : 'sanciones'} en su historial
              </span>
            )}
          </div>
          {report.reported_user_id && (
            <button onClick={() => onView({ entityType: 'user', entityId: report.reported_user_id })} className="flex items-center gap-1.5 mt-2 text-slate-500 text-xs font-bold hover:text-slate-800 hover:underline">
              <UserRound size={13} /> Ver su perfil e historial
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Reportado por</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{report.reporter_name || '—'}</p>
          <p className="text-xs text-slate-500 mt-1">
            Motivo: <span className="font-bold text-slate-700">{REASON_LABELS[report.reason] || report.reason}</span>
          </p>
          {report.description
            ? <p className="text-sm text-slate-600 italic mt-1 leading-relaxed">&ldquo;{report.description}&rdquo;</p>
            : <p className="text-xs text-slate-400 italic mt-1">No escribió ningún comentario.</p>}
        </div>
      </div>

      {/* Qué se resolvió */}
      {!isPending && (
        <div className={`mt-3 rounded-2xl border px-4 py-3 ${outcome?.cls || 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          <p className="text-sm font-bold">
            {outcome?.text || 'Reporte cerrado.'}
            {banLifted && <span className="font-semibold text-emerald-700"> Después se reactivó la cuenta.</span>}
          </p>
          <p className="text-xs opacity-80 mt-0.5">
            {report.resolved_by_name ? `Por ${report.resolved_by_name}` : 'Resuelto'}{report.resolved_at ? ` · ${fmtDate(report.resolved_at)}` : ''}
          </p>
          {report.action_message && (
            <p className="text-sm italic mt-2 leading-relaxed">Mensaje enviado: &ldquo;{report.action_message}&rdquo;</p>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="flex justify-end gap-2 mt-5 flex-wrap">
        {canSanction && banned && (
          <button onClick={onUnban} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-all active:scale-95">
            <RotateCcw size={16} /> Reactivar cuenta
          </button>
        )}
        {isPending && (
          <>
            <button onClick={() => onAction(report, 'dismiss')} className="flex items-center gap-2 px-4 py-2 text-slate-500 text-sm font-bold hover:bg-slate-100 rounded-xl transition-all">
              <XCircle size={16} /> Descartar reporte
            </button>
            {canSanction && (
              <button onClick={() => onAction(report, 'warn')} className="flex items-center gap-2 px-4 py-2 text-amber-600 text-sm font-bold hover:bg-amber-50 rounded-xl transition-all">
                <MessageSquareWarning size={16} /> Advertir a quien publicó
              </button>
            )}
            {canRemove && exists && (
              <button onClick={() => onAction(report, 'remove_content')} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-all active:scale-95">
                <EyeOff size={16} /> Eliminar {meta.noun}
              </button>
            )}
            {canSanction && !banned && (
              <button onClick={() => onAction(report, 'ban_user')} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-all active:scale-95">
                <Ban size={16} /> Suspender cuenta
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
