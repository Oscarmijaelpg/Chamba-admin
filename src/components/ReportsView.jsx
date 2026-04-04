import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, AlertTriangle, Trash2, CheckCircle, ExternalLink, Filter, MessageSquare } from 'lucide-react';

export default function ReportsView() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chamba_reports')
      .select('*, reporter:users!reporter_id(full_name), chamba:chambas!chamba_id(title, status, employer_id)')
      .eq('status', filter)
      .order('created_at', { ascending: false });
    
    if (!error) setReports(data || []);
    setLoading(false);
  };

  const handleResolve = async (reportId, chambaId, action) => {
    if (action === 'delete') {
      if (!confirm('¿Eliminar la chamba reportada?')) return;
      await supabase.from('chambas').delete().eq('id', chambaId);
    }
    
    await supabase.from('chamba_reports')
      .update({ status: 'resolved' })
      .eq('id', reportId);
    
    fetchReports();
  };

  const getFilterBtnClass = (val) => (
    `px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === val ? 'bg-primary-500 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reportes de Comunidad</h2>
          <p className="text-slate-500 text-sm mt-1">Modera contenido denunciado por los usuarios.</p>
        </div>
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button onClick={() => setFilter('pending')} className={getFilterBtnClass('pending')}>Pendientes</button>
          <button onClick={() => setFilter('resolved')} className={getFilterBtnClass('resolved')}>Resueltos</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-20 text-slate-400 italic">Cargando reportes...</div>
        ) : reports.length > 0 ? reports.map((report) => (
          <div key={report.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-start gap-6 hover:border-red-200 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
              <AlertTriangle size={24} />
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Chamba: {report.chamba?.title || 'Contenido eliminado'}</h3>
                  <p className="text-xs text-slate-400 mt-1 font-bold">Denunciado por: <span className="text-slate-600">{report.reporter?.full_name}</span></p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{new Date(report.created_at).toLocaleString()}</span>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-2">Motivo del reporte:</p>
                <p className="text-sm text-slate-700 leading-relaxed italic">"{report.reason}"</p>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => handleResolve(report.id, report.chamba_id, 'dismiss')}
                  className="px-4 py-2 text-slate-500 text-sm font-bold hover:bg-slate-100 rounded-xl transition-all"
                >
                  Descartar
                </button>
                <button 
                  onClick={() => handleResolve(report.id, report.chamba_id, 'delete')}
                  className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 shadow-lg shadow-red-100 transition-all active:scale-95"
                >
                  <Trash2 size={16} /> Eliminar Chamba
                </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="bg-white p-20 rounded-3xl border border-slate-100 text-center">
            <div className="w-20 h-20 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">¡Todo limpio!</h3>
            <p className="text-slate-400 mt-2">No hay reportes pendientes de moderación.</p>
          </div>
        )}
      </div>
    </div>
  );
}
