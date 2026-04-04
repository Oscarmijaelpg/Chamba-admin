import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, MoreVertical, Shield, ShieldAlert, CheckCircle } from 'lucide-react';

export default function UsersTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  const toggleBan = async (user) => {
    const newStatus = !user.is_banned;
    const confirmMsg = newStatus 
      ? `¿Estás seguro de que quieres BANEAR a ${user.full_name}? No podrá entrar a la app.`
      : `¿Quieres quitar el ban a ${user.full_name}?`;
    
    if (confirm(confirmMsg)) {
      const { error } = await supabase
        .from('users')
        .update({ is_banned: newStatus })
        .eq('id', user.id);
      
      if (!error) {
        fetchUsers();
      } else {
        alert('Error al actualizar el estado del usuario. ¿Ya ejecutaste el SQL de is_banned?');
      }
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h2>
        <div className="relative w-72">
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
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
              <th className="px-6 py-4">Usuario</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Ubicación</th>
              <th className="px-6 py-4">Saldo</th>
              <th className="px-6 py-4">Rating</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-400">Cargando usuarios...</td></tr>
            ) : filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-all">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 overflow-hidden">
                      {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{user.full_name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${user.user_type === 'employer' ? 'bg-indigo-50 text-indigo-600' : 'bg-primary-50 text-primary-600'}`}>
                    {user.user_type === 'employer' ? 'Contratador' : 'Trabajador'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{user.city || 'No especificada'}</td>
                <td className="px-6 py-4 font-bold text-slate-800 text-sm">Bs. {user.wallet_balance || 0}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-amber-500">{user.rating?.toFixed(1) || '0.0'}</span>
                    <p className="text-[10px] text-slate-400">({user.jobs_completed || 0} jobs)</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center items-center gap-2">
                    {user.is_admin ? (
                      <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full text-[10px] font-bold">
                        <Shield size={12} /> ADMIN
                      </div>
                    ) : (
                      <div className="text-slate-400 text-[10px] font-bold">USUARIO</div>
                    )}
                    {user.is_banned && (
                      <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-[10px] font-bold">
                        <ShieldAlert size={12} /> BANEADO
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
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
  );
}
