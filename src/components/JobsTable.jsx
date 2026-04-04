// src/components/JobsTable.jsx - TABLA DE TRABAJOS
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Trash2, ExternalLink, MapPin, Briefcase, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function JobsTable() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    let query = supabase
      .from('jobs')
      .select('*, employer:users(full_name, email)')
      .order('created_at', { ascending: false });
    
    const { data, error } = await query;
    if (!error) setJobs(data || []);
    setLoading(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase
      .from('jobs')
      .update({ status: newStatus })
      .eq('id', id);
    if (!error) fetchJobs();
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este trabajo?')) {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (!error) fetchJobs();
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchTerm || 
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-green-50 text-green-600';
      case 'closed': return 'bg-red-50 text-red-600';
      case 'draft': return 'bg-slate-100 text-slate-500';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'open': return 'Abierto';
      case 'closed': return 'Cerrado';
      case 'draft': return 'Borrador';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Trabajos</h2>
        <span className="text-slate-500 text-sm">{filteredJobs.length} trabajos</span>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por título o empresa..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="open">Abiertos</option>
          <option value="closed">Cerrados</option>
          <option value="draft">Borrador</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Cargando...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No hay trabajos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                  <th className="px-6 py-4">Trabajo</th>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Empleador</th>
                  <th className="px-6 py-4">Ciudad</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-800">{job.title}</p>
                        <p className="text-xs text-slate-400 truncate max-w-xs">{job.description?.substring(0, 60)}...</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{job.company || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{job.employer?.full_name || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500">{job.city || '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                        {getStatusLabel(job.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-400">
                        {new Date(job.created_at).toLocaleDateString('es-BO')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleStatusChange(job.id, job.status === 'open' ? 'closed' : 'open')}
                          className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                          title={job.status === 'open' ? 'Cerrar' : 'Abrir'}
                        >
                          {job.status === 'open' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
