import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Clock, User, Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, Filter } from 'lucide-react';

const ACTION_LABELS = {
  'user.register': 'Nuevo usuario registrado',
  'user.login': 'Inicio de sesión',
  'chamba.create': 'Publicó una chamba',
  'chamba.update': 'Actualizó una chamba',
  'chamba.delete': 'Eliminó una chamba',
  'chamba.complete': 'Completó una chamba',
  'chamba.cancel': 'Canceló una chamba',
  'payment.deposit': 'Depósito realizado',
  'payment.withdraw': 'Retiro solicitado',
  'payment.release': 'Pago liberado (escrow)',
  'payment.refund': 'Pago reembolsado',
  'report.create': 'Reportó a un usuario',
  'report.resolve': 'Reporte resuelto',
  'user.suspend': 'Usuario suspendido',
  'user.unsuspend': 'Usuario reactivado',
  'admin.action': 'Acción administrativa',
};

export default function AuditLogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateRange, setDateRange] = useState('today');

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, dateRange]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, user:users(full_name, email)')
        .order('created_at', { ascending: false });

      // Filter by date
      if (dateRange === 'today') {
        query = query.gte('created_at', new Date().toISOString().split('T')[0]);
      } else if (dateRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (dateRange === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('created_at', monthAgo.toISOString());
      }

      // Filter by action
      if (actionFilter !== 'all') {
        query = query.like('action', `${actionFilter}%`);
      }

      const { data, error } = await query.limit(200);
      
      if (!error) setLogs(data || []);
    } catch (e) {
      console.error('Error fetching audit logs:', e);
      // Si no existe la tabla, usar datos demo
      setLogs([]);
    }
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.user?.full_name?.toLowerCase().includes(searchLower) ||
      log.action?.toLowerCase().includes(searchLower) ||
      log.details?.toString()?.toLowerCase().includes(searchLower)
    );
  });

  const getActionIcon = (action) => {
    if (action?.includes('register') || action?.includes('login')) return <User size={16} />;
    if (action?.includes('chamba')) return <Shield size={16} />;
    if (action?.includes('payment')) return <RefreshCw size={16} />;
    if (action?.includes('report')) return <AlertTriangle size={16} />;
    return <Clock size={16} />;
  };

  const getActionColor = (action) => {
    if (action?.includes('register')) return 'bg-blue-100 text-blue-600';
    if (action?.includes('chamba') && action?.includes('create')) return 'bg-green-100 text-green-600';
    if (action?.includes('chamba') && action?.includes('delete')) return 'bg-red-100 text-red-600';
    if (action?.includes('payment') && action?.includes('deposit')) return 'bg-emerald-100 text-emerald-600';
    if (action?.includes('payment') && action?.includes('withdraw')) return 'bg-amber-100 text-amber-600';
    return 'bg-slate-100 text-slate-600';
  };

  // Stats
  const stats = {
    total: logs.length,
    users: logs.filter(l => l.action?.includes('user')).length,
    Chambas: logs.filter(l => l.action?.includes('chamba')).length,
    payments: logs.filter(l => l.action?.includes('payment')).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Registro de Actividad</h2>
          <p className="text-slate-500 text-sm mt-1">Auditoría de todas las acciones en la plataforma.</p>
        </div>
        <button 
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-600 transition-all"
        >
          <RefreshCw size={18} />
          Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase">Total Acciones</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase">Usuarios</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.users}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase">Chambas</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.Chambas}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100">
          <p className="text-slate-500 text-xs font-bold uppercase">Pagos</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.payments}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por usuario, acción o detalle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-3 bg-white rounded-2xl border border-slate-200 focus:outline-none font-medium"
        >
          <option value="all">Todas las acciones</option>
          <option value="user">Usuarios</option>
          <option value="chamba">Chambas</option>
          <option value="payment">Pagos</option>
          <option value="report">Reportes</option>
        </select>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-3 bg-white rounded-2xl border border-slate-200 focus:outline-none font-medium"
        >
          <option value="today">Hoy</option>
          <option value="week">Última semana</option>
          <option value="month">Último mes</option>
          <option value="all">Todo el tiempo</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-slate-500 mt-4">Cargando registros...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Shield size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No hay registros de actividad</p>
            <p className="text-slate-400 text-sm mt-1">Los registros aparecerán cuando los usuarios realicen acciones</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                  <th className="px-6 py-4">Fecha/Hora</th>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Acción</th>
                  <th className="px-6 py-4">Detalles</th>
                  <th className="px-6 py-4">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-800">
                        {new Date(log.created_at).toLocaleDateString('es-BO')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(log.created_at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{log.user?.full_name || 'Sistema'}</p>
                      <p className="text-xs text-slate-400">{log.user?.email || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600 max-w-xs truncate">
                        {log.details ? JSON.stringify(log.details) : '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-400">{log.ip_address || '-'}</p>
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
