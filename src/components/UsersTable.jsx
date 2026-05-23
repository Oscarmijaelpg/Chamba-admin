import React, { useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { Search, MoreVertical, Shield, ShieldAlert, CheckCircle } from 'lucide-react';

export default function UsersTable() {
  const { users, loading, setBanned } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');

  const toggleBan = async (user) => {
    const newStatus = !user.is_banned;
    const confirmMsg = newStatus
      ? `¿Estás seguro de que quieres BANEAR a ${user.full_name}? No podrá entrar a la app.`
      : `¿Quieres quitar el ban a ${user.full_name}?`;
    if (!confirm(confirmMsg)) return;
    const error = await setBanned(user.id, newStatus);
    if (error) alert('Error al actualizar el estado del usuario: ' + error.message);
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h2>
        <div className="relative sm:ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar usuario..."
            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 hidden sm:table-cell">Ubicación</th>
                <th className="px-4 py-3">Saldo</th>
                <th className="px-4 py-3 hidden md:table-cell">Rating</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-400">Cargando usuarios...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-400">No se encontraron usuarios</td></tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 overflow-hidden shrink-0">
                        {user.avatar_url ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" /> : user.full_name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{user.full_name}</p>
                        <p className="text-xs text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase whitespace-nowrap ${user.user_type === 'employer' ? 'bg-primary-100 text-primary-700' : 'bg-primary-50 text-primary-600'}`}>
                      {user.user_type === 'employer' ? 'Contratador' : 'Trabajador'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 hidden sm:table-cell">{user.city || '-'}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-sm whitespace-nowrap">Bs. {user.wallet_balance || 0}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-amber-500">{user.rating?.toFixed(1) || '0.0'}</span>
                      <p className="text-[10px] text-slate-400">({user.jobs_completed || 0})</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {user.is_admin ? (
                        <div className="flex items-center gap-1 text-primary-700 bg-primary-100 px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap">
                          <Shield size={12} /> ADMIN
                        </div>
                      ) : (
                        <div className="text-slate-400 text-[10px] font-bold">USUARIO</div>
                      )}
                      {user.is_banned && (
                        <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap">
                          <ShieldAlert size={12} /> BAN
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {!user.is_admin && (
                        <button
                          onClick={() => toggleBan(user)}
                          className={`p-2 rounded-lg transition-all ${user.is_banned ? 'text-green-500 hover:bg-green-50' : 'text-red-400 hover:bg-red-50'}`}
                          title={user.is_banned ? 'Quitar Ban' : 'Banear Usuario'}
                        >
                          {user.is_banned ? <CheckCircle size={18} /> : <ShieldAlert size={18} />}
                        </button>
                      )}
                      <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
