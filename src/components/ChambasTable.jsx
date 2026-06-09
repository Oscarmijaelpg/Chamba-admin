import React from 'react';
import { Search, MapPin, Trash2, ExternalLink } from 'lucide-react';
import { useChambas } from '../hooks/useChambas';
import Pagination from './Pagination';

export default function ChambasTable() {
  const {
    chambas, loading, isFetching, updateStatus, deleteChamba,
    search, setSearch, page, setPage, totalPages, total, pageSize,
  } = useChambas();

  const handleStatusChange = (id, newStatus) => updateStatus(id, newStatus);

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta chamba? Esta acción no se puede deshacer.')) {
      await deleteChamba(id);
    }
  };

  // Búsqueda y paginación resueltas en el servidor (hook useChambas).
  const filteredChambas = chambas;

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-primary-50 text-primary-600';
      case 'in_progress': return 'bg-primary-50 text-primary-700';
      case 'completed': return 'bg-slate-100 text-slate-600';
      case 'cancelled': return 'bg-red-50 text-red-600';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Moderación de Chambas</h2>
        <div className="relative w-full sm:w-72 sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por título o descripción..."
            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-20 text-slate-400">Cargando chambas...</div>
        ) : filteredChambas.length === 0 ? (
          <div className="text-center py-20 text-slate-400">No se encontraron chambas</div>
        ) : filteredChambas.map((chamba) => (
          <div key={chamba.id} className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-4 sm:gap-6 hover:border-primary-200 transition-all">
            <div className="w-full sm:w-24 h-40 sm:h-24 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
              {chamba.images && chamba.images[0] ? (
                <img src={chamba.images[0]} alt={chamba.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <MapPin size={24} />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 text-lg truncate">{chamba.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">Por: {chamba.employer?.full_name}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
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
                  <p className="text-xl font-black text-primary-600 whitespace-nowrap">Bs. {chamba.price_min}</p>
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

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPage={setPage}
        isFetching={isFetching}
      />
    </div>
  );
}
