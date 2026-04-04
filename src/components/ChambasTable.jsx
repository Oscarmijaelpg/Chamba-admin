import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, MapPin, Trash2, ExternalLink, Filter } from 'lucide-react';

export default function ChambasTable() {
  const [chambas, setChambas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchChambas();
  }, []);

  const fetchChambas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chambas')
      .select('*, employer:users(full_name)')
      .order('created_at', { ascending: false });
    if (!error) setChambas(data || []);
    setLoading(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase
      .from('chambas')
      .update({ status: newStatus })
      .eq('id', id);
    if (!error) fetchChambas();
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta chamba? Esta acción no se puede deshacer.')) {
      const { error } = await supabase.from('chambas').delete().eq('id', id);
      if (!error) fetchChambas();
    }
  };

  const filteredChambas = chambas.filter(c => 
    c.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-primary-50 text-primary-600';
      case 'in_progress': return 'bg-blue-50 text-blue-600';
      case 'completed': return 'bg-slate-100 text-slate-600';
      case 'cancelled': return 'bg-red-50 text-red-600';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Moderación de Chambas</h2>
        <div className="flex gap-4">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por título o descripción..." 
              className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50 transition-all">
            <Filter size={16} /> Filtrar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando chambas...</div>
        ) : filteredChambas.map((chamba) => (
          <div key={chamba.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex gap-6 hover:border-primary-200 transition-all">
            <div className="w-24 h-24 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
              {chamba.images && chamba.images[0] ? (
                <img src={chamba.images[0]} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <MapPin size={24} />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{chamba.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">Por: {chamba.employer?.full_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border-none focus:ring-0 cursor-pointer ${getStatusColor(chamba.status)}`}
                    value={chamba.status}
                    onChange={(e) => handleStatusChange(chamba.id, e.target.value)}
                  >
                    <option value="open">Abierta</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="completed">Finalizada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                  <p className="text-xl font-black text-primary-600">Bs. {chamba.price_min}</p>
                </div>
              </div>
              
              <p className="text-slate-500 text-sm mt-3 line-clamp-2 leading-relaxed">
                {chamba.description}
              </p>
              
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <MapPin size={12} /> {chamba.city} {chamba.is_virtual && '(Virtual)'}
                  </div>
                  <div className="text-slate-300 text-xs">|</div>
                  <div className="text-slate-400 text-xs">
                    Publicado el {new Date(chamba.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button className="p-2 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all" title="Ver detalles">
                    <ExternalLink size={18} />
                  </button>
                  <button onClick={() => handleDelete(chamba.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
