import React, { useState } from 'react';
import { Save, Percent, Tag, BellRing, Check, AlertCircle, QrCode } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { supabase } from '../lib/supabase';

export default function SettingsView() {
  const { settings, setSettings, loading, save } = useSettings();
  const [toast, setToast] = useState(null); // { type: 'ok'|'error', msg }
  const [uploading, setUploading] = useState(false);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Sube el QR de pago al bucket público `archivos` y guarda su URL en settings.
  const uploadQr = async (file) => {
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `payment-qr/qr-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('archivos').upload(path, file, {
        upsert: true, contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('archivos').getPublicUrl(path);
      setSettings((s) => ({ ...s, recharge_qr_url: data.publicUrl }));
      showToast('ok', 'QR subido. Tocá "Guardar Cambios" para aplicarlo.');
    } catch (e) {
      showToast('error', e.message || 'No se pudo subir el QR.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const error = await save(settings);
    if (error) showToast('error', error.message);
    else showToast('ok', 'Ajustes guardados correctamente.');
  };

  return (
    <div className="max-w-4xl space-y-8">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold transition-all ${
          toast.type === 'ok' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'ok' ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Ajustes de la Plataforma</h2>
        <p className="text-slate-500 text-sm mt-1">Configura las reglas de negocio y parámetros globales.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Finanzas */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-3 text-primary-600">
            <Percent size={20} />
            <h3 className="font-bold">Finanzas</h3>
          </div>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Monto Mínimo de Retiro (Bs.)</label>
              <input
                type="number"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                value={settings.min_withdrawal}
                onChange={(e) => setSettings({...settings, min_withdrawal: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Comisión sobre pagos en custodia (%)</label>
              <input
                type="number"
                min="0" max="100" step="0.5"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                value={settings.commission_rate ?? 10}
                onChange={(e) => setSettings({...settings, commission_rate: e.target.value === '' ? '' : Number(e.target.value)})}
              />
              <p className="text-[10px] text-slate-400 mt-2">Se descuenta del pago al trabajador cuando la chamba se paga con billetera Conecta2 (pago protegido). No aplica a pagos externos (QR/Binance).</p>
            </div>
          </div>
        </div>

        {/* QR de recarga */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-3 text-primary-600">
            <QrCode size={20} />
            <h3 className="font-bold">QR de recarga</h3>
          </div>
          <p className="text-xs text-slate-400">Imagen del QR de pago que ve el usuario al recargar saldo (tu QR de banco/billetera).</p>
          <div className="flex items-center gap-4">
            {settings.recharge_qr_url ? (
              <img src={settings.recharge_qr_url} alt="QR de recarga" className="w-32 h-32 object-contain rounded-xl border border-slate-100 bg-slate-50" />
            ) : (
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 text-xs text-center px-2">Sin QR configurado</div>
            )}
            <div className="flex flex-col gap-2">
              <label className={`cursor-pointer px-4 py-2.5 rounded-xl text-sm font-bold text-center transition-all ${uploading ? 'bg-slate-100 text-slate-400' : 'bg-primary-50 text-primary-700 hover:bg-primary-100'}`}>
                {uploading ? 'Subiendo…' : 'Subir imagen'}
                <input type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => e.target.files?.[0] && uploadQr(e.target.files[0])} />
              </label>
              {settings.recharge_qr_url && (
                <button onClick={() => setSettings((s) => ({ ...s, recharge_qr_url: '' }))} className="px-4 py-2.5 bg-red-50 text-red-500 rounded-xl text-sm font-bold hover:bg-red-100 transition-all">Quitar</button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-slate-400">Recordá tocar "Guardar Cambios" abajo para aplicar.</p>
        </div>

        {/* Categorías y App */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-3 text-primary-600">
            <Tag size={20} />
            <h3 className="font-bold">General</h3>
          </div>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre de la App</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                value={settings.app_name}
                onChange={(e) => setSettings({...settings, app_name: e.target.value})}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-bold text-slate-800">Modo Mantenimiento</p>
                <p className="text-[10px] text-slate-400">Bloquea el acceso a todos los usuarios.</p>
              </div>
              <button 
                onClick={() => setSettings({...settings, maintenance_mode: !settings.maintenance_mode})}
                className={`w-12 h-6 rounded-full transition-all relative ${settings.maintenance_mode ? 'bg-red-500' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.maintenance_mode ? 'right-1' : 'left-1'}`}></div>
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Versión Mínima Requerida</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                value={settings.min_version}
                onChange={(e) => setSettings({...settings, min_version: e.target.value})}
                placeholder="Ej: 1.1.0"
              />
              <p className="text-[10px] text-slate-400 mt-2">Usuarios con versión menor serán obligados a actualizar.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">URL de la Tienda</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                value={settings.store_url}
                onChange={(e) => setSettings({...settings, store_url: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Anuncios */}
        <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center gap-3 text-amber-500">
            <BellRing size={20} />
            <h3 className="font-bold">Anuncio Global</h3>
          </div>
          <textarea 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm h-24 resize-none"
            placeholder="Escribe un mensaje que verán todos los usuarios en la app..."
            value={settings.announcement}
            onChange={(e) => setSettings({...settings, announcement: e.target.value})}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={loading}
          className={`flex items-center gap-2 px-8 py-4 ${loading ? 'bg-slate-400' : 'bg-primary-600 hover:bg-primary-700'} text-white rounded-2xl font-bold shadow-xl shadow-primary-200 transition-all active:scale-95`}
        >
          {loading ? 'Guardando...' : (
            <>
              <Save size={20} />
              Guardar Cambios
            </>
          )}
        </button>
      </div>
    </div>
  );
}
