import React from 'react';
import { Gavel } from 'lucide-react';
import { useModerationHistory } from '../hooks/useModeration';

// Historial de moderación de una cuenta: contadores, sanciones aplicadas y
// reportes recibidos (RPC admin_user_moderation_history).

const ACTION_META = {
  warn:           { label: 'Advertencia', cls: 'bg-amber-100 text-amber-700' },
  remove_content: { label: 'Aviso eliminado', cls: 'bg-slate-200 text-slate-700' },
  ban:            { label: 'Suspensión', cls: 'bg-red-100 text-red-700' },
  unban:          { label: 'Reactivación', cls: 'bg-green-100 text-green-700' },
};
const ENTITY_LABEL = { user: 'Perfil', chamba: 'Chamba', job: 'Empleo', alert: 'Alerta' };
const REASON_LABELS = {
  fraud: 'Fraude o estafa', harassment: 'Acoso o insultos', spam: 'Spam o publicidad',
  fake: 'Perfil falso', inappropriate: 'Contenido inapropiado', other: 'Otro motivo',
  false: 'Falsa o inventada',
};
const REPORT_STATUS = {
  pending: 'Pendiente', dismissed: 'Descartado', content_removed: 'Contenido removido',
  user_banned: 'Usuario suspendido', warned: 'Advertido', resolved: 'Resuelto',
};

const when = (iso) => (iso ? new Date(iso).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '');

export default function ModerationHistory({ userId }) {
  const { data, isLoading, error } = useModerationHistory(userId);
  const counts = data?.counts ?? {};
  const actions = data?.actions ?? [];
  const reports = data?.reports ?? [];

  return (
    <div className="bg-slate-50 rounded-xl p-3 space-y-3">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Gavel size={14} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Historial de moderación</span>
      </div>

      {isLoading && <p className="text-sm text-slate-400 italic">Cargando historial...</p>}
      {error && <p className="text-sm text-red-600">No se pudo cargar el historial de moderación.</p>}

      {data && (
        <>
          <div className="grid grid-cols-4 gap-2">
            <Count label="Advertencias" value={counts.warnings} />
            <Count label="Eliminados" value={counts.removed} />
            <Count label="Suspensiones" value={counts.bans} />
            <Count label="Reportes" value={counts.reports} />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Sanciones</p>
            {actions.length === 0 ? (
              <p className="text-sm text-slate-400">Sin sanciones registradas.</p>
            ) : (
              <ul className="space-y-1.5">
                {actions.map((a) => {
                  const meta = ACTION_META[a.action] || { label: a.action, cls: 'bg-slate-200 text-slate-700' };
                  return (
                    <li key={a.id} className="bg-white rounded-lg border border-slate-100 p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${meta.cls}`}>{meta.label}</span>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">{when(a.created_at)}</span>
                      </div>
                      {a.entity_type && a.entity_type !== 'user' && (
                        <p className="text-xs text-slate-600 mt-1.5 truncate">
                          {ENTITY_LABEL[a.entity_type] || a.entity_type}: <span className="font-semibold">{a.entity_title || 'sin título'}</span>
                        </p>
                      )}
                      {a.message && <p className="text-xs text-slate-600 mt-1.5 italic leading-relaxed">&ldquo;{a.message}&rdquo;</p>}
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Por {a.admin_name || 'un administrador'} · {a.notified ? 'usuario notificado' : 'sin notificar'}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Reportes recibidos</p>
            {reports.length === 0 ? (
              <p className="text-sm text-slate-400">Nadie reportó esta cuenta.</p>
            ) : (
              <ul className="space-y-1.5">
                {reports.map((r) => (
                  <li key={r.id} className="bg-white rounded-lg border border-slate-100 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {ENTITY_LABEL[r.entity_type] || r.entity_type} · {REASON_LABELS[r.reason] || r.reason}
                      </span>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">{when(r.created_at)}</span>
                    </div>
                    {r.description && <p className="text-xs text-slate-600 mt-1.5 italic leading-relaxed">&ldquo;{r.description}&rdquo;</p>}
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Por {r.reporter_name || 'usuario eliminado'} · {REPORT_STATUS[r.resolution] || REPORT_STATUS[r.status] || r.status}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Count({ label, value }) {
  return (
    <div className="bg-white rounded-lg border border-slate-100 py-2 text-center">
      <p className="text-lg font-bold text-slate-800 leading-none">{value ?? 0}</p>
      <p className="text-[10px] font-semibold text-slate-400 mt-1">{label}</p>
    </div>
  );
}
