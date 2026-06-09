// Formato compartido del feed de actividad de la plataforma (dashboard + vista
// "Actividad de la plataforma"). NO es el audit log de mutaciones (eso es /audit).

export const ACTIVITY_KIND = {
  user: { text: 'Nuevo usuario registrado', icon: 'user' },
  chamba: { text: 'Nueva chamba publicada', icon: 'briefcase' },
  deposit: { text: 'Depósito recibido', icon: 'wallet' },
  withdrawal: { text: 'Retiro procesado', icon: 'wallet' },
};

export function relTime(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'hace instantes';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

// Normaliza un item del RPC ({ id, kind, label, created_at }) a la forma de UI.
export function formatActivity(a) {
  const k = ACTIVITY_KIND[a.kind] || { text: 'Actividad', icon: 'user' };
  return {
    id: `${a.kind}-${a.id}`,
    text: a.label ? `${k.text} · ${a.label}` : k.text,
    time: relTime(a.created_at),
    icon: k.icon,
  };
}
