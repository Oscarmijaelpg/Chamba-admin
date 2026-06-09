// Etiquetas e iconos de las acciones de audit_logs. Compartido entre la vista de
// Auditoría y el feed de "Actividad reciente" del Dashboard para no duplicar el mapa.
export const ACTION_LABELS = {
  'user.register': 'Nuevo usuario registrado',
  'user.login': 'Inicio de sesión',
  'user.delete': 'Usuario eliminado',
  'user.suspend': 'Usuario suspendido',
  'user.unsuspend': 'Usuario reactivado',
  'chamba.create': 'Publicó una chamba',
  'chamba.update': 'Actualizó una chamba',
  'chamba.delete': 'Eliminó una chamba',
  'chamba.complete': 'Completó una chamba',
  'chamba.cancel': 'Canceló una chamba',
  'payment.deposit': 'Depósito realizado',
  'payment.withdraw': 'Retiro solicitado',
  'payment.release': 'Pago liberado (escrow)',
  'payment.refund': 'Pago reembolsado',
  'report.create': 'Reportó contenido',
  'report.resolve': 'Reporte resuelto',
  'admin.action': 'Acción administrativa',
};

export function actionText(action) {
  return ACTION_LABELS[action] || action || 'Actividad';
}

// Nombre de icono compatible con el switch del Dashboard ('user' | 'briefcase' | 'wallet').
export function actionIcon(action) {
  if (action?.startsWith('chamba')) return 'briefcase';
  if (action?.startsWith('payment')) return 'wallet';
  return 'user';
}
