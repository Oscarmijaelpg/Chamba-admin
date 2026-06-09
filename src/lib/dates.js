// Convierte una fecha ISO 'YYYY-MM-DD' (la que devuelven los RPC) en una etiqueta
// legible. Se parsea como hora local (T00:00:00) para no desfasar un día por UTC.
export function dayLabel(iso, opts = { day: 'numeric', month: 'short' }) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-BO', opts);
}
