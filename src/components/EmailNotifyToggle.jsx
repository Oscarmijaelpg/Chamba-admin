import React, { useEffect, useRef } from 'react';
import { Mail, BellOff, Bell } from 'lucide-react';
import { useUserReach } from '../hooks/useAdminActions';

// "Avisar también por correo". Si el usuario no tiene push en ningún lado
// (app ni navegador), viene tildado: si no, el mensaje lo ve recién cuando abra
// la app. El correo lleva el texto y un botón al chat en la web.
export default function EmailNotifyToggle({ userId, checked, onChange, compact = false }) {
  const { data: reach, isLoading } = useUserReach(userId);
  const hasPush = Number(reach?.push_devices ?? 0) + Number(reach?.web_push ?? 0) > 0;
  const defaulted = useRef(false);

  useEffect(() => {
    if (!defaulted.current && reach) {
      defaulted.current = true;
      onChange(!hasPush);
    }
  }, [reach, hasPush, onChange]);

  if (!userId) return null;
  return (
    <div className={compact ? 'flex flex-wrap items-center gap-x-3 gap-y-1' : 'space-y-1.5'}>
      <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-primary-600" disabled={!reach?.email} />
        <Mail size={14} className="text-slate-400" />
        Avisar también por correo{reach?.email ? <span className="text-slate-400 truncate">({reach.email})</span> : null}
      </label>
      {!isLoading && reach && (
        <p className={`flex items-center gap-1 text-[11px] font-semibold ${hasPush ? 'text-green-600' : 'text-amber-600'}`}>
          {hasPush ? <Bell size={11} /> : <BellOff size={11} />}
          {hasPush
            ? `Tiene notificaciones push (${Number(reach.push_devices) + Number(reach.web_push)} dispositivo${Number(reach.push_devices) + Number(reach.web_push) === 1 ? '' : 's'})`
            : 'No tiene notificaciones push: sin correo no se entera hasta que abra la app'}
        </p>
      )}
    </div>
  );
}
