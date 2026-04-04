import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, CreditCard, Edit, Trash2, Plus, Save, X, DollarSign, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function PricingView() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pricing_config')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (!error && data) {
      setPlans(data);
    }
    setLoading(false);
  };

  const handleEdit = (plan) => {
    setEditingId(plan.id);
    setEditForm({ ...plan });
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from('pricing_config')
      .update({
        label: editForm.label,
        description: editForm.description,
        price: parseFloat(editForm.price) || 0,
        credits: editForm.credits ? parseInt(editForm.credits) : null,
        duration_days: editForm.duration_days ? parseInt(editForm.duration_days) : null,
        is_active: editForm.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingId);

    if (!error) {
      fetchPlans();
      setEditingId(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const getTypeBadge = (id) => {
    if (id.includes('premium')) return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg">Premium</span>;
    if (id.includes('highlight')) return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-lg">Destacado</span>;
    return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-lg">Pago Único</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Planes y Precios</h2>
          <p className="text-slate-500 text-sm mt-1">Configura los precios para publicar y destacar contenido.</p>
        </div>
        <button 
          onClick={fetchPlans}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-all"
        >
          <RefreshCw size={18} />
          Actualizar
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-primary-500 to-emerald-600 rounded-3xl p-6 text-white">
        <h3 className="text-lg font-bold mb-2">💰 Sistema de Monetización</h3>
        <p className="text-primary-100 text-sm">
          Los usuarios pueden comprar créditos o planes premium para publicar chambas/trabajos y destacar sus postulaciones.
          Los precios se cobran en Bolivianos (Bs).
        </p>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-slate-500 mt-4">Cargando planes...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Descripción</th>
                  <th className="px-6 py-4">Precio (Bs)</th>
                  <th className="px-6 py-4">Duración</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{plan.label}</p>
                      <p className="text-xs text-slate-400 mt-1">{getTypeBadge(plan.id)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 max-w-xs">{plan.description || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {editingId === plan.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.price}
                          onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                          className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold"
                        />
                      ) : (
                        <span className="font-bold text-slate-800">Bs. {parseFloat(plan.price || 0).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === plan.id ? (
                        <input
                          type="number"
                          value={editForm.duration_days || ''}
                          onChange={(e) => setEditForm({ ...editForm, duration_days: e.target.value })}
                          placeholder="Días"
                          className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                        />
                      ) : (
                        <span className="text-sm text-slate-600">
                          {plan.duration_days ? `${plan.duration_days} días` : 'Ilimitado'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === plan.id ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editForm.is_active}
                            onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                            className="w-4 h-4 rounded text-primary-500"
                          />
                          <span className="text-sm">Activo</span>
                        </label>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {plan.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {plan.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        {editingId === plan.id ? (
                          <>
                            <button 
                              onClick={handleSave}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              title="Guardar"
                            >
                              <Save size={18} />
                            </button>
                            <button 
                              onClick={handleCancel}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Cancelar"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => handleEdit(plan)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-slate-50 rounded-2xl p-6">
        <h4 className="font-bold text-slate-800 mb-3">📝 Cómo funciona:</h4>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>• <strong>Publicar Trabajo/Chamba:</strong> Los usuarios pagan por cada publicación o usan créditos</li>
          <li>• <strong>Plan Premium:</strong> Da publicaciones ilimitadas + destacado automático</li>
          <li>• <strong>Destacar Postulación:</strong> Los trabajadores pueden pagar para aparecer primero</li>
          <li>• <strong>Créditos:</strong> Los usuarios pueden comprar créditos打包 para usar después</li>
        </ul>
      </div>
    </div>
  );
}
