import React, { useState, useEffect } from 'react';
import { Bell, Mail, AlertTriangle, Save, Check, Send, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import ConfirmModal from './ConfirmModal';

export default function AlertsConfig() {
  const [alerts, setAlerts] = useState({
    newWithdrawal: true,
    newReport: true,
    suspiciousActivity: true,
    dailySummary: true,
  });
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Broadcast push
  const { sending, result, error: sendError, sendToAll, getTokenCount } = useNotifications();
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tokenCount, setTokenCount] = useState(null);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const stored = localStorage.getItem('admin_alerts');
      if (stored) setAlerts(JSON.parse(stored));
      setEmail(localStorage.getItem('admin_email') || 'admin@chamba.app');
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      localStorage.setItem('admin_alerts', JSON.stringify(alerts));
      localStorage.setItem('admin_email', email);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // localStorage inaccesible (Private Browsing sin quota)
    }
  };

  const handleOpenConfirm = async () => {
    const count = await getTokenCount();
    setTokenCount(count);
    setConfirmOpen(true);
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    await sendToAll(pushTitle, pushBody);
  };

  if (loading) return <div className="text-center py-8 text-slate-500">Cargando...</div>;

  const alertOptions = [
    { key: 'newWithdrawal', label: 'Nuevas solicitudes de retiro', icon: Mail },
    { key: 'newReport', label: 'Nuevos reportes de spam', icon: AlertTriangle },
    { key: 'suspiciousActivity', label: 'Actividad sospechosa detectada', icon: AlertTriangle },
    { key: 'dailySummary', label: 'Resumen diario', icon: Bell },
  ];

  const canSend = pushTitle.trim() && pushBody.trim() && !sending;

  return (
    <div className="space-y-6">
      {/* Email Settings */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Email de Notificaciones</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Email del Administrador</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="admin@example.com"
          />
        </div>
      </div>

      {/* Alert Preferences */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Preferencias de Alertas</h3>
        <div className="space-y-4">
          {alertOptions.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
              <div className="flex items-center gap-3">
                <Icon size={20} className="text-primary-600" />
                <label className="font-medium text-slate-800">{label}</label>
              </div>
              <button
                role="switch"
                aria-checked={alerts[key]}
                aria-label={label}
                onClick={() => setAlerts({ ...alerts, [key]: !alerts[key] })}
                className={`w-12 h-6 rounded-full transition ${alerts[key] ? 'bg-primary-600' : 'bg-slate-300'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transition transform ${alerts[key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
          saved ? 'bg-green-50 text-green-600' : 'bg-primary-600 hover:bg-primary-700 text-white'
        }`}
      >
        {saved ? <Check size={20} /> : <Save size={20} />}
        {saved ? 'Guardado' : 'Guardar Cambios'}
      </button>

      {/* ── Push Broadcast ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Bell size={18} className="text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">Notificación a todos los usuarios</h3>
            <p className="text-xs text-slate-400 mt-0.5">Envía un push notification a cada usuario con la app instalada</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Título *</label>
            <input
              type="text"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              maxLength={60}
              placeholder="Ej: ¡Nueva oferta disponible!"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mensaje *</label>
            <textarea
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Ej: Hay nuevas chambas cerca de ti. ¡Entra a ver!"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        {/* Preview */}
        {(pushTitle || pushBody) && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Vista previa</p>
            <div className="bg-slate-800 rounded-2xl p-4 max-w-sm mx-auto shadow-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center shrink-0">
                  <Bell size={14} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Conecta2</span>
                    <span className="text-[10px] text-slate-500">ahora</span>
                  </div>
                  <p className="text-sm font-semibold text-white leading-snug">
                    {pushTitle || 'Título de la notificación'}
                  </p>
                  {pushBody && (
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed line-clamp-2">{pushBody}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resultado anterior */}
        {result && (
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <span className="flex items-center gap-1.5 text-sm font-bold text-green-600">
              <CheckCircle size={16} /> {result.sent} enviadas
            </span>
            {result.failed > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-bold text-red-500">
                <XCircle size={16} /> {result.failed} fallidas
              </span>
            )}
            {result.cleaned > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-500">
                <Trash2 size={16} /> {result.cleaned} inactivos limpiados
              </span>
            )}
          </div>
        )}

        {sendError && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{sendError}</p>
        )}

        <button
          onClick={handleOpenConfirm}
          disabled={!canSend}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-primary-600 text-white hover:bg-primary-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sending ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</>
          ) : (
            <><Send size={16} /> Enviar a todos los usuarios</>
          )}
        </button>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSend}
        loading={sending}
        title="Enviar notificación"
        message={`Se enviará la notificación a ${tokenCount ?? '…'} usuarios con la app instalada. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, enviar"
        confirmClass="bg-primary-600 hover:bg-primary-700 text-white"
      />
    </div>
  );
}
