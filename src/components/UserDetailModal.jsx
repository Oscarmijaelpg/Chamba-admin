import React, { useState } from 'react';
import {
  X, Shield, ShieldAlert, ShieldCheck, MapPin, Star, Briefcase, Wallet, Calendar, Mail, User,
  Trash2, Cake, Tag, Bell, BellOff, MessageSquareWarning, MessageCircle, CreditCard, AtSign, Clock,
  LogIn, Smartphone, Send, Lock, Globe, FileText, ThumbsUp, ThumbsDown, Minus, Paperclip,
  Megaphone, Building2, Flag, MessagesSquare, Link2,
} from 'lucide-react';
import ModerationHistory from './ModerationHistory';
import SendMessageModal from './SendMessageModal';
import { useUserDetail } from '../hooks/useAdminActions';

const waLink = (num) => `https://wa.me/${String(num || '').replace(/[^0-9]/g, '')}`;
const money = (n) => `Bs. ${Number(n ?? 0).toLocaleString('es-BO', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-BO', { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

const CHAMBA_STATUS = {
  open: ['Abierta', 'bg-green-50 text-green-600'], in_progress: ['En progreso', 'bg-blue-50 text-blue-600'],
  completed: ['Finalizada', 'bg-slate-100 text-slate-600'], cancelled: ['Cancelada', 'bg-red-50 text-red-500'],
  closed: ['Cerrada', 'bg-slate-100 text-slate-500'], deleted: ['Borrada', 'bg-slate-100 text-slate-400'],
};
const JOB_STATUS = {
  open: ['Abierto', 'bg-green-50 text-green-600'], active: ['Activo', 'bg-green-50 text-green-600'],
  closed: ['Cerrado', 'bg-slate-100 text-slate-500'], expired: ['Expirado', 'bg-slate-100 text-slate-500'],
  rejected: ['Rechazado', 'bg-red-50 text-red-500'], pending: ['Pendiente', 'bg-amber-50 text-amber-600'],
  pending_review: ['En revisión', 'bg-amber-50 text-amber-600'],
};
const APP_STATUS = {
  pending: ['Pendiente', 'bg-amber-50 text-amber-600'], accepted: ['Aceptada', 'bg-green-50 text-green-600'],
  rejected: ['Rechazada', 'bg-red-50 text-red-500'], cancelled: ['Retirada', 'bg-slate-100 text-slate-500'],
};
const TX_TYPE = {
  deposit: 'Recarga', withdrawal: 'Retiro', payment: 'A custodia', payout: 'Pago recibido', refund: 'Devolución',
  commission: 'Comisión', escrow_settled: 'Custodia resuelta', publish_chamba: 'Publicar chamba',
  publish_job: 'Publicar empleo', publish_highlight: 'Destacar', purchase_premium: 'Premium',
};
const TX_STATUS = { completed: 'Completado', pending: 'Pendiente', cancelled: 'Rechazado', failed: 'Falló' };

// Las acciones (onWarn / onBan / onUnban / onDelete) son opcionales: sin ellas
// el modal es de solo lectura (así se abre desde Reportes). Enviar mensaje está
// siempre: no cambia nada de la cuenta.
export default function UserDetailModal({ user, onClose, onWarn, onBan, onUnban, onDelete }) {
  const [tab, setTab] = useState('perfil');
  const [messaging, setMessaging] = useState(false);
  const [toast, setToast] = useState(null);
  const { data: detail, isLoading, error } = useUserDetail(user?.id);

  if (!user) return null;

  // Lo de la ficha completa pisa lo del listado (es más fresco y trae más).
  const u = { ...user, ...(detail?.user ?? {}) };
  const priv = detail?.private ?? null;
  const auth = detail?.auth ?? null;
  const wallet = detail?.wallet ?? null;
  const contact = u.public_contact && typeof u.public_contact === 'object' ? u.public_contact : {};

  // `preferences` solo viene en las filas del listado (RPC admin_users_list).
  const hasPreferences = user.preferences !== undefined;
  const preferences = Array.isArray(user.preferences) ? user.preferences : [];
  const banAction = u.is_banned ? onUnban : onBan;
  const hasActions = !u.is_admin && (onWarn || banAction || onDelete);

  const chambas = detail?.chambas ?? [];
  const jobs = detail?.jobs ?? [];
  const alerts = detail?.alerts ?? [];
  const applications = detail?.applications ?? [];
  const reviews = detail?.reviews_received ?? [];
  const txs = detail?.transactions ?? [];
  const rep = detail?.reputation ?? {};

  const TABS = [
    { id: 'perfil', label: 'Perfil' },
    { id: 'publicaciones', label: 'Publicaciones', count: chambas.length + jobs.length + alerts.length },
    { id: 'postulaciones', label: 'Postulaciones', count: applications.length },
    { id: 'dinero', label: 'Dinero', count: txs.length },
    { id: 'resenas', label: 'Reseñas', count: reviews.length },
    { id: 'moderacion', label: 'Moderación' },
  ];

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {toast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold shadow-lg">{toast}</div>
        )}

        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 sm:pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center font-bold text-primary-600 text-2xl overflow-hidden shrink-0">
              {u.avatar_url
                ? <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                : (u.full_name?.charAt(0) || <User size={28} />)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-800 text-xl truncate">{u.full_name || 'Sin nombre'}</p>
              {u.username && <p className="text-xs text-slate-400 truncate">@{u.username}</p>}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge cls={u.user_type === 'employer' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}>
                  {u.user_type === 'employer' ? 'Contratador' : u.user_type === 'both' ? 'Ambos' : 'Trabajador'}
                </Badge>
                {u.is_admin && <Badge cls="bg-primary-100 text-primary-700"><Shield size={10} /> Admin</Badge>}
                {u.is_banned && <Badge cls="bg-red-100 text-red-600"><ShieldAlert size={10} /> Suspendido</Badge>}
                {priv?.whatsapp && <Badge cls="bg-green-50 text-green-700"><MessageCircle size={10} /> WhatsApp</Badge>}
                {priv?.id_number && <Badge cls="bg-blue-50 text-blue-700"><CreditCard size={10} /> CI cargado</Badge>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all shrink-0">
              <X size={20} />
            </button>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            <button onClick={() => setMessaging(true)} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-dark text-white text-xs font-bold hover:bg-slate-800 transition-all">
              <Send size={14} /> Enviar mensaje
            </button>
            {priv?.whatsapp && (
              <a href={waLink(priv.whatsapp)} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-green-500 text-white text-xs font-bold hover:bg-green-600 transition-all">
                <MessageCircle size={14} /> Abrir WhatsApp
              </a>
            )}
            {u.username && (
              <a href={`https://conecta2.dev/${u.username}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-all">
                <Link2 size={14} /> Perfil público
              </a>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 border-b border-slate-100 overflow-x-auto shrink-0">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${tab === t.id ? 'border-dark text-dark' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {t.label}{t.count ? <span className="ml-1 text-[10px] text-slate-400">{t.count}</span> : null}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {error && <p className="text-sm text-red-500">No se pudo cargar la ficha completa: {error.message}</p>}

          {tab === 'perfil' && (
            <>
              <Section title="Contacto" icon={<Smartphone size={14} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoCard icon={<Mail size={14} />} label="Email" value={u.email} copy />
                  <InfoCard icon={<MessageCircle size={14} />} label="WhatsApp" loading={isLoading}
                    value={priv?.whatsapp || 'No lo cargó'}
                    hint={priv?.whatsapp ? (priv.whatsapp_public ? 'Visible en su perfil' : 'Privado: solo lo ves vos') : null}
                    href={priv?.whatsapp ? waLink(priv.whatsapp) : null} />
                  <InfoCard icon={<CreditCard size={14} />} label="Cédula (CI)" loading={isLoading} value={priv?.id_number || 'No la cargó'} copy={!!priv?.id_number} />
                  {auth?.phone && <InfoCard icon={<Smartphone size={14} />} label="Teléfono de la cuenta" value={auth.phone} />}
                  {Object.entries(contact).filter(([, v]) => v).map(([k, v]) => (
                    <InfoCard key={k} icon={<Globe size={14} />} label={`Contacto público · ${k}`} value={String(v)} />
                  ))}
                </div>
              </Section>

              <Section title="Cuenta" icon={<User size={14} />}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <InfoCard icon={<MapPin size={14} />} label="Ciudad" value={u.city || 'No especificada'} />
                  <InfoCard icon={<Cake size={14} />} label="Edad" value={u.age ? `${u.age} años` : 'No especificada'} />
                  <InfoCard icon={<AtSign size={14} />} label="Usuario" value={u.username ? `@${u.username}` : '—'} />
                  <InfoCard icon={<Calendar size={14} />} label="Registrado" value={fmtDate(u.created_at)} />
                  <InfoCard icon={<Clock size={14} />} label="Última actividad" loading={isLoading} value={fmtDateTime(detail?.last_seen ?? user.last_seen)} />
                  <InfoCard icon={<LogIn size={14} />} label="Último ingreso" loading={isLoading} value={fmtDateTime(auth?.last_sign_in_at)} />
                  <InfoCard icon={<Lock size={14} />} label="Ingresa con" loading={isLoading} value={auth?.provider === 'google' ? 'Google' : auth?.provider === 'email' ? 'Correo y contraseña' : (auth?.provider || '—')} />
                  <InfoCard icon={<ShieldCheck size={14} />} label="Correo confirmado" loading={isLoading} value={auth?.email_confirmed_at ? fmtDate(auth.email_confirmed_at) : 'No'} />
                  <InfoCard icon={<Bell size={14} />} label="Dispositivos con push" loading={isLoading} value={detail?.push_devices ?? 0} />
                </div>
              </Section>

              <Section title="Actividad" icon={<Briefcase size={14} />}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <InfoCard icon={<Wallet size={14} />} label="Saldo" loading={isLoading} value={money(wallet?.balance ?? u.wallet_balance)} />
                  <InfoCard icon={<Lock size={14} />} label="En custodia" loading={isLoading} value={money(wallet?.held_balance)} />
                  <InfoCard icon={<ThumbsUp size={14} />} label="Reseñas" loading={isLoading} value={`${rep.positive ?? 0} 👍 · ${rep.neutral ?? 0} · ${rep.negative ?? 0} 👎`} />
                  <InfoCard icon={<Briefcase size={14} />} label="Trabajos hechos" value={u.jobs_completed || 0} />
                  <InfoCard icon={<MessagesSquare size={14} />} label="Chats" loading={isLoading} value={detail?.chats ?? 0} />
                  <InfoCard icon={<Flag size={14} />} label="Lo reportaron" loading={isLoading} value={detail?.reports_against ?? 0} />
                  <InfoCard icon={<Flag size={14} />} label="Reportó" loading={isLoading} value={detail?.reports_made ?? 0} />
                  <InfoCard icon={<Star size={14} />} label="Rating (legado)" value={`${Number(u.rating || 0).toFixed(1)} ★`} />
                </div>
              </Section>

              {(u.bio || (u.skills ?? []).length > 0) && (
                <Section title="Sobre el usuario" icon={<FileText size={14} />}>
                  {u.bio && <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 rounded-xl p-3">{u.bio}</p>}
                  {(u.skills ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {u.skills.map((s) => <span key={s} className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">{s}</span>)}
                    </div>
                  )}
                </Section>
              )}

              <Portfolio items={u.portfolio} legacy={u.portfolio_items} />

              {hasPreferences && (
                <Section title="Categorías de interés" icon={<Tag size={14} />}
                  extra={preferences.length > 0 && (
                    <Badge cls={user.pref_notify ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}>
                      {user.pref_notify ? <Bell size={10} /> : <BellOff size={10} />}
                      {user.pref_notify ? 'Alertas on' : 'Alertas off'}
                    </Badge>
                  )}>
                  {preferences.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {preferences.map((p) => <span key={p} className="text-[11px] font-medium text-primary-700 bg-primary-100 px-2 py-1 rounded-lg">{p}</span>)}
                    </div>
                  ) : <p className="text-sm text-slate-400">No guardó preferencias de categorías.</p>}
                </Section>
              )}
            </>
          )}

          {tab === 'publicaciones' && (
            <>
              <Section title={`Chambas (${chambas.length})`} icon={<Briefcase size={14} />}>
                <List loading={isLoading} empty="No publicó chambas." items={chambas} render={(c) => (
                  <Row key={c.id}
                    title={c.title}
                    sub={[c.city, money(c.price_min), c.payment_method === 'internal' ? 'Pago protegido' : 'Pago externo', `${c.applicants} postulante${c.applicants === 1 ? '' : 's'}`, fmtDate(c.created_at)].filter(Boolean).join(' · ')}
                    badge={c.hidden_reason === 'paused' ? ['Pausada', 'bg-amber-50 text-amber-600'] : CHAMBA_STATUS[c.status]}
                    star={c.is_highlighted}
                    href={`https://conecta2.dev/chamba/${c.id}`} />
                )} />
              </Section>
              <Section title={`Empleos (${jobs.length})`} icon={<Building2 size={14} />}>
                <List loading={isLoading} empty="No publicó empleos." items={jobs} render={(j) => (
                  <Row key={j.id}
                    title={j.title}
                    sub={[j.company, j.city, fmtDate(j.created_at)].filter(Boolean).join(' · ')}
                    badge={j.hidden_reason === 'paused' ? ['Pausado', 'bg-amber-50 text-amber-600'] : JOB_STATUS[j.status]} />
                )} />
              </Section>
              <Section title={`Alertas ciudadanas (${alerts.length})`} icon={<Megaphone size={14} />}>
                <List loading={isLoading} empty="No publicó alertas." items={alerts} render={(a) => (
                  <Row key={a.id}
                    title={a.company_name || a.alert_type || 'Alerta'}
                    sub={[a.city, a.anonymous ? 'Anónima' : null, fmtDate(a.created_at)].filter(Boolean).join(' · ')}
                    body={a.description} />
                )} />
              </Section>
            </>
          )}

          {tab === 'postulaciones' && (
            <List loading={isLoading} empty="No se postuló a ninguna chamba." items={applications} render={(a) => (
              <Row key={a.id}
                title={a.chamba_title || 'Chamba borrada'}
                sub={[a.proposed_price ? `Propuso ${money(a.proposed_price)}` : null, fmtDate(a.created_at)].filter(Boolean).join(' · ')}
                body={a.message}
                badge={APP_STATUS[a.status]} />
            )} />
          )}

          {tab === 'dinero' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <InfoCard icon={<Wallet size={14} />} label="Saldo disponible" loading={isLoading} value={money(wallet?.balance)} />
                <InfoCard icon={<Lock size={14} />} label="En custodia" loading={isLoading} value={money(wallet?.held_balance)} />
              </div>
              <Section title="Últimos 30 movimientos" icon={<FileText size={14} />}>
                <List loading={isLoading} empty="Sin movimientos." items={txs} render={(t) => (
                  <Row key={t.id}
                    title={`${TX_TYPE[t.type] ?? t.type} · ${money(t.amount)}`}
                    sub={[TX_STATUS[t.status] ?? t.status, fmtDateTime(t.created_at)].join(' · ')}
                    body={t.description}
                    href={t.proof_url} hrefLabel={<><Paperclip size={11} /> Comprobante</>} />
                )} />
              </Section>
            </>
          )}

          {tab === 'resenas' && (
            <List loading={isLoading} empty="Todavía no recibió reseñas." items={reviews} render={(r, i) => (
              <div key={i} className="flex gap-3 bg-slate-50 rounded-xl p-3">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.sentiment === 'positive' ? 'bg-green-100 text-green-600' : r.sentiment === 'negative' ? 'bg-red-100 text-red-500' : 'bg-slate-200 text-slate-500'}`}>
                  {r.sentiment === 'positive' ? <ThumbsUp size={14} /> : r.sentiment === 'negative' ? <ThumbsDown size={14} /> : <Minus size={14} />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{r.reviewer || 'Usuario'}</p>
                  {r.comment && <p className="text-sm text-slate-600 mt-0.5">{r.comment}</p>}
                  <p className="text-[11px] text-slate-400 mt-0.5">{fmtDate(r.created_at)}</p>
                </div>
              </div>
            )} />
          )}

          {tab === 'moderacion' && <ModerationHistory userId={user.id} />}
        </div>

        {/* Footer acciones */}
        {hasActions && (
          <div className="p-4 border-t border-slate-100 flex flex-wrap gap-2">
            {onWarn && !u.is_banned && (
              <button onClick={() => { onWarn(user); onClose(); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-100 text-amber-600 hover:bg-amber-100 rounded-xl text-sm font-bold transition-all whitespace-nowrap">
                <MessageSquareWarning size={16} /> Advertir
              </button>
            )}
            {banAction && (u.is_banned ? (
              <button onClick={() => { onUnban(user); onClose(); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold transition-all whitespace-nowrap">
                <ShieldCheck size={16} /> Reactivar cuenta
              </button>
            ) : (
              <button onClick={() => { onBan(user); onClose(); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-all whitespace-nowrap">
                <ShieldAlert size={16} /> Suspender
              </button>
            ))}
            {onDelete && (
              <button onClick={() => { onDelete(user); onClose(); }} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl text-sm font-bold transition-all whitespace-nowrap">
                <Trash2 size={16} /> Eliminar
              </button>
            )}
          </div>
        )}
      </div>

      {messaging && (
        <SendMessageModal entityType="user" entityId={user.id} targetName={u.full_name}
          onClose={() => setMessaging(false)} onSent={showToast} />
      )}
    </div>
  );
}

function Badge({ cls, children }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${cls}`}>{children}</span>;
}

function Section({ title, icon, extra, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-slate-400">
          {icon}
          <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
        </div>
        {extra}
      </div>
      {children}
    </div>
  );
}

function InfoCard({ icon, label, value, hint, href, copy, loading }) {
  const [copied, setCopied] = useState(false);
  const content = loading ? <span className="block h-4 w-20 bg-slate-200 rounded animate-pulse" /> : value;
  return (
    <div className="bg-slate-50 rounded-xl p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider truncate">{label}</span>
      </div>
      {href && !loading ? (
        <a href={href} target="_blank" rel="noreferrer" className="block text-sm font-semibold text-green-700 hover:underline truncate">{value}</a>
      ) : copy && !loading ? (
        <button onClick={() => { navigator.clipboard?.writeText(String(value)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          title="Copiar" className="block w-full text-left text-sm font-semibold text-slate-700 truncate hover:text-slate-900">
          {copied ? 'Copiado ✓' : value}
        </button>
      ) : (
        <p className="text-sm font-semibold text-slate-700 truncate">{content}</p>
      )}
      {hint && !loading && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function List({ loading, empty, items, render }) {
  if (loading) return <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-14 bg-slate-50 rounded-xl animate-pulse" />)}</div>;
  if (!items.length) return <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-3">{empty}</p>;
  return <div className="space-y-2">{items.map(render)}</div>;
}

function Row({ title, sub, body, badge, star, href, hrefLabel }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {star && <Star size={12} className="inline -mt-0.5 mr-1 text-amber-500 fill-amber-500" />}
            {title}
          </p>
          {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {badge && <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge[1]}`}>{badge[0]}</span>}
      </div>
      {body && <p className="text-xs text-slate-500 mt-1.5 line-clamp-3 whitespace-pre-line">{body}</p>}
      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-bold text-blue-600 hover:underline">
          {hrefLabel || 'Ver'}
        </a>
      )}
    </div>
  );
}

function Portfolio({ items, legacy }) {
  const list = Array.isArray(items) ? items : [];
  const old = Array.isArray(legacy) ? legacy : [];
  if (!list.length && !old.length) return null;
  const urlOf = (it) => (typeof it === 'string' ? it : it?.url || it?.image || it?.uri);
  const all = [...list, ...old].map(urlOf).filter(Boolean);
  if (!all.length) return null;
  return (
    <Section title={`Portafolio (${all.length})`} icon={<FileText size={14} />}>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {all.map((src, i) => (
          <a key={i} href={src} target="_blank" rel="noreferrer" className="shrink-0">
            {/\.(mp4|mov|webm)(\?|$)/i.test(src)
              ? <span className="h-24 w-24 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">Video</span>
              : <img src={src} alt={`portafolio ${i + 1}`} className="h-24 w-24 object-cover rounded-xl border border-slate-100" />}
          </a>
        ))}
      </div>
    </Section>
  );
}
