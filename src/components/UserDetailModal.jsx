import React from 'react';
import {
  X, Shield, ShieldAlert, ShieldCheck, MapPin,
  Star, Briefcase, Wallet, Calendar, Mail, User, Trash2, Cake, Tag, Bell, BellOff
} from 'lucide-react';

export default function UserDetailModal({ user, onClose, onBan, onUnban, onDelete }) {
  if (!user) return null;

  const preferences = Array.isArray(user.preferences) ? user.preferences : [];

  const joinedDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Handle bar mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4 sm:p-5 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-lg">Detalle de usuario</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Avatar + nombre */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center font-bold text-primary-600 text-2xl overflow-hidden shrink-0">
              {user.avatar_url
                ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                : (user.full_name?.charAt(0) || <User size={28} />)
              }
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-xl truncate">{user.full_name || 'Sin nombre'}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${user.user_type === 'employer' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>
                  {user.user_type === 'employer' ? 'Contratador' : 'Trabajador'}
                </span>
                {user.is_admin && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-primary-100 text-primary-700">
                    <Shield size={10} /> Admin
                  </span>
                )}
                {user.is_banned && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-red-100 text-red-600">
                    <ShieldAlert size={10} /> Baneado
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard icon={<Mail size={14} />} label="Email" value={user.email} full />
            <InfoCard icon={<MapPin size={14} />} label="Ciudad" value={user.city || 'No especificada'} />
            <InfoCard icon={<Cake size={14} />} label="Edad" value={user.age ? `${user.age} años` : 'No especificada'} />
            <InfoCard icon={<Wallet size={14} />} label="Saldo" value={`Bs. ${user.wallet_balance || 0}`} />
            <InfoCard icon={<Star size={14} />} label="Rating" value={`${user.rating?.toFixed(1) || '0.0'} ★`} />
            <InfoCard icon={<Briefcase size={14} />} label="Trabajos" value={user.jobs_completed || 0} />
            <InfoCard icon={<Calendar size={14} />} label="Registrado" value={joinedDate} />
          </div>

          {/* Categorías guardadas como preferencia */}
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Tag size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Categorías de interés</span>
              </div>
              {preferences.length > 0 && (
                <span className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${user.pref_notify ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                  {user.pref_notify ? <Bell size={10} /> : <BellOff size={10} />}
                  {user.pref_notify ? 'Alertas on' : 'Alertas off'}
                </span>
              )}
            </div>
            {preferences.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {preferences.map((p) => (
                  <span key={p} className="text-[11px] font-medium text-primary-700 bg-primary-100 px-2 py-1 rounded-lg">
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No guardó preferencias de categorías.</p>
            )}
          </div>
        </div>

        {/* Footer acciones */}
        {!user.is_admin && (
          <div className="p-5 border-t border-slate-100 space-y-2.5">
            {user.is_banned ? (
              <button
                onClick={() => { onUnban(user); onClose(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-all"
              >
                <ShieldCheck size={18} />
                Quitar ban
              </button>
            ) : (
              <button
                onClick={() => { onBan(user); onClose(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all"
              >
                <ShieldAlert size={18} />
                Banear usuario
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => { onDelete(user); onClose(); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all"
              >
                <Trash2 size={18} />
                Eliminar permanentemente
              </button>
            )}
          </div>
        )}
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
