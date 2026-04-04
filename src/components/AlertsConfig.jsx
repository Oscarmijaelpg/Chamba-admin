import React, { useState, useEffect } from 'react';
import { Bell, Mail, AlertTriangle, Save, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      // For now, use localStorage (in production, save to DB)
      const stored = localStorage.getItem('admin_alerts');
      if (stored) {
        setAlerts(JSON.parse(stored));
      }
      
      const storedEmail = localStorage.getItem('admin_email') || 'admin@chamba.app';
      setEmail(storedEmail);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      localStorage.setItem('admin_alerts', JSON.stringify(alerts));
      localStorage.setItem('admin_email', email);
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving alerts:', error);
    }
  };

  if (loading) return <div className="text-center py-8 text-slate-500">Cargando...</div>;

  const alertOptions = [
    { key: 'newWithdrawal', label: 'Nuevas solicitudes de retiro', icon: Mail },
    { key: 'newReport', label: 'Nuevos reportes de spam', icon: AlertTriangle },
    { key: 'suspiciousActivity', label: 'Actividad sospechosa detectada', icon: AlertTriangle },
    { key: 'dailySummary', label: 'Resumen diario', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Email Settings */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Email de Notificaciones</h3>
        <div className="space-y-4">
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
                onClick={() => setAlerts({ ...alerts, [key]: !alerts[key] })}
                className={`w-12 h-6 rounded-full transition ${
                  alerts[key] ? 'bg-primary-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition transform ${
                    alerts[key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
          saved
            ? 'bg-green-50 text-green-600'
            : 'bg-primary-600 hover:bg-primary-700 text-white'
        }`}
      >
        {saved ? <Check size={20} /> : <Save size={20} />}
        {saved ? 'Guardado' : 'Guardar Cambios'}
      </button>
    </div>
  );
}
