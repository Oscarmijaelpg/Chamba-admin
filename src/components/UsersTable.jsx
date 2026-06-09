import React, { useState } from 'react';
import { useUsers } from '../hooks/useUsers';
import { Search, Shield, ShieldAlert, ShieldCheck, Star, MapPin, MoreVertical, Users, Trash2, Cake, Clock } from 'lucide-react';
import { relTime } from '../lib/activity';
import ConfirmModal from './ConfirmModal';
import UserDetailModal from './UserDetailModal';
import Pagination from './Pagination';

// Opciones de orden (combinan campo + dirección en un solo valor "campo|dir").
const SORT_OPTIONS = [
  { value: 'created_at|desc', label: 'Registro: más reciente' },
  { value: 'created_at|asc',  label: 'Registro: más antiguo' },
  { value: 'last_seen|desc',  label: 'Última conexión: reciente' },
  { value: 'last_seen|asc',   label: 'Última conexión: antigua' },
  { value: 'age|desc',        label: 'Edad: mayor a menor' },
  { value: 'age|asc',         label: 'Edad: menor a mayor' },
  { value: 'full_name|asc',   label: 'Nombre: A → Z' },
];

const AGE_BANDS = [
  { value: 'all',   label: 'Todas las edades' },
  { value: '18-24', label: '18 – 24 años' },
  { value: '25-34', label: '25 – 34 años' },
  { value: '35-44', label: '35 – 44 años' },
  { value: '45-54', label: '45 – 54 años' },
  { value: '55+',   label: '55+ años' },
  { value: 'none',  label: 'Sin edad' },
];

const lastSeenLabel = (iso) => (iso ? relTime(iso) : 'Nunca');

export default function UsersTable() {
  const {
    users, loading, isFetching, setBanned, deleteUser,
    search, setSearch, page, setPage, totalPages, total, pageSize,
    city, setCity, ageBand, setAgeBand, sort, setSort, dir, setDir, cities,
  } = useUsers();
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, user: null, action: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openBanConfirm = (user) => setConfirmState({ open: true, user, action: 'ban' });
  const openUnbanConfirm = (user) => setConfirmState({ open: true, user, action: 'unban' });
  const openDeleteConfirm = (user) => setConfirmState({ open: true, user, action: 'delete' });
  const closeConfirm = () => setConfirmState({ open: false, user: null, action: null });

  const handleConfirm = async () => {
    const { user, action } = confirmState;
    setActionLoading(true);
    const error = action === 'delete'
      ? await deleteUser(user.id)
      : await setBanned(user.id, action === 'ban');
    setActionLoading(false);
    closeConfirm();
    if (error) {
      const fallback = action === 'delete' ? 'Error al eliminar el usuario' : 'Error al actualizar el usuario';
      showToast(error.message || fallback, 'error');
    } else if (action === 'delete') {
      showToast(`${user.full_name} fue eliminado permanentemente`);
    } else {
      showToast(action === 'ban' ? `${user.full_name} fue baneado` : `Ban removido a ${user.full_name}`);
    }
  };

  // Configuración del modal de confirmación según la acción
  const confirmConfig = {
    ban: {
      title: `Banear a ${confirmState.user?.full_name}`,
      message: 'El usuario no podrá iniciar sesión en la app. Podrás revertir esta acción en cualquier momento.',
      confirmLabel: 'Sí, banear',
      confirmClass: 'bg-red-500 hover:bg-red-600 text-white',
    },
    unban: {
      title: `Quitar ban a ${confirmState.user?.full_name}`,
      message: 'El usuario recuperará acceso completo a la aplicación.',
      confirmLabel: 'Sí, quitar ban',
      confirmClass: 'bg-green-500 hover:bg-green-600 text-white',
    },
    delete: {
      title: `Eliminar a ${confirmState.user?.full_name}`,
      message: 'Acción permanente e irreversible. Se borrarán su cuenta y acceso, junto con sus chambas, postulaciones, billetera y mensajes. No podrás deshacerlo.',
      confirmLabel: 'Sí, eliminar',
      confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
    },
  }[confirmState.action] || {};

  // La búsqueda y la paginación se resuelven en el servidor (hook useUsers).
  const filteredUsers = users;

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-slate-800'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h2>
          <p className="text-slate-400 text-sm mt-0.5">{total.toLocaleString()} usuarios registrados</p>
        </div>
        <div className="relative sm:ml-auto w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Barra de filtros y orden (resueltos en el servidor) */}
      <div className="flex flex-wrap items-center gap-2.5">
        <FilterSelect label="Ciudad" value={city} onChange={setCity}>
          <option value="">Todas las ciudades</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </FilterSelect>

        <FilterSelect label="Edad" value={ageBand} onChange={setAgeBand}>
          {AGE_BANDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </FilterSelect>

        <FilterSelect
          label="Ordenar"
          value={`${sort}|${dir}`}
          onChange={(v) => { const [s, d] = v.split('|'); setSort(s); setDir(d); }}
        >
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </FilterSelect>

        {(city || ageBand !== 'all') && (
          <button
            onClick={() => { setCity(''); setAgeBand('all'); }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1.5"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Estado vacío / cargando */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Cargando usuarios...</p>
        </div>
      )}

      {!loading && filteredUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Users size={40} className="text-slate-200" />
          <p className="font-medium">No se encontraron usuarios</p>
        </div>
      )}

      {/* MOBILE: cards */}
      {!loading && filteredUsers.length > 0 && (
        <>
          <div className="md:hidden space-y-3">
            {filteredUsers.map(user => (
              <UserCard
                key={user.id}
                user={user}
                onView={() => setSelectedUser(user)}
                onBan={() => openBanConfirm(user)}
                onUnban={() => openUnbanConfirm(user)}
                onDelete={() => openDeleteConfirm(user)}
              />
            ))}
          </div>

          {/* DESKTOP: tabla */}
          <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                    <th className="px-5 py-3.5">Usuario</th>
                    <th className="px-5 py-3.5">Tipo</th>
                    <th className="px-5 py-3.5">Edad</th>
                    <th className="px-5 py-3.5">Ciudad</th>
                    <th className="px-5 py-3.5">Última conexión</th>
                    <th className="px-5 py-3.5">Saldo</th>
                    <th className="px-5 py-3.5">Rating</th>
                    <th className="px-5 py-3.5 text-center">Estado</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition-all">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar user={user} size="sm" />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{user.full_name}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[180px]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <TypeBadge type={user.user_type} />
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">{user.age ? `${user.age}` : '-'}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500">{user.city || '-'}</td>
                      <td
                        className="px-5 py-3.5 text-sm text-slate-500 whitespace-nowrap"
                        title={user.last_seen ? new Date(user.last_seen).toLocaleString() : 'Sin conexiones registradas'}
                      >
                        {lastSeenLabel(user.last_seen)}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800 text-sm whitespace-nowrap">
                        Bs. {user.wallet_balance || 0}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <Star size={12} className="text-amber-400 fill-amber-400" />
                          <span className="text-sm font-semibold text-slate-700">{user.rating?.toFixed(1) || '0.0'}</span>
                          <span className="text-xs text-slate-400">({user.jobs_completed || 0})</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <StatusBadges user={user} />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          {!user.is_admin && (
                            user.is_banned ? (
                              <button
                                onClick={() => openUnbanConfirm(user)}
                                title="Quitar ban"
                                className="p-2 rounded-lg text-green-500 hover:bg-green-50 transition-all"
                              >
                                <ShieldCheck size={17} />
                              </button>
                            ) : (
                              <button
                                onClick={() => openBanConfirm(user)}
                                title="Banear usuario"
                                className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-all"
                              >
                                <ShieldAlert size={17} />
                              </button>
                            )
                          )}
                          {!user.is_admin && (
                            <button
                              onClick={() => openDeleteConfirm(user)}
                              title="Eliminar usuario"
                              className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedUser(user)}
                            title="Ver detalle"
                            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-all"
                          >
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
        </>
      )}

      {/* Paginación */}
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPage={setPage}
        isFetching={isFetching}
      />

      {/* Modal de detalle */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onBan={(u) => { setSelectedUser(null); openBanConfirm(u); }}
          onUnban={(u) => { setSelectedUser(null); openUnbanConfirm(u); }}
          onDelete={(u) => { setSelectedUser(null); openDeleteConfirm(u); }}
        />
      )}

      {/* Modal de confirmación */}
      <ConfirmModal
        isOpen={confirmState.open}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        loading={actionLoading}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        confirmClass={confirmConfig.confirmClass}
      />
    </div>
  );
}

/* ─── Subcomponentes ─── */

function UserCard({ user, onView, onBan, onUnban, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      {/* Fila principal */}
      <div className="flex items-center gap-3">
        <Avatar user={user} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-slate-800 truncate">{user.full_name || 'Sin nombre'}</p>
            {user.is_admin && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded-md uppercase">
                <Shield size={9} /> Admin
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate">{user.email}</p>
        </div>
        <button
          onClick={onView}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all shrink-0"
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Chips de info */}
      <div className="flex flex-wrap gap-2">
        <TypeBadge type={user.user_type} />
        {user.city && (
          <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
            <MapPin size={10} /> {user.city}
          </span>
        )}
        {user.age != null && (
          <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
            <Cake size={10} /> {user.age} años
          </span>
        )}
        <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
          <Clock size={10} /> {lastSeenLabel(user.last_seen)}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
          <Star size={10} className="text-amber-400 fill-amber-400" />
          {user.rating?.toFixed(1) || '0.0'} ({user.jobs_completed || 0})
        </span>
        <span className="text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg font-semibold">
          Bs. {user.wallet_balance || 0}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-50">
        <StatusBadges user={user} />
        {!user.is_admin && (
          <div className="flex items-center gap-2">
            {user.is_banned ? (
              <button
                onClick={onUnban}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl text-xs font-bold transition-all"
              >
                <ShieldCheck size={13} /> Quitar ban
              </button>
            ) : (
              <button
                onClick={onBan}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-xs font-bold transition-all"
              >
                <ShieldAlert size={13} /> Banear
              </button>
            )}
            <button
              onClick={onDelete}
              title="Eliminar usuario"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl text-xs font-bold transition-all"
            >
              <Trash2 size={13} /> Eliminar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <label className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 pl-3 pr-1 py-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer pr-1"
      >
        {children}
      </select>
    </label>
  );
}

function Avatar({ user, size = 'sm' }) {
  const sizeClass = size === 'md' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sizeClass} rounded-full bg-primary-50 flex items-center justify-center font-bold text-primary-600 overflow-hidden shrink-0`}>
      {user.avatar_url
        ? <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
        : (user.full_name?.charAt(0)?.toUpperCase() || '?')
      }
    </div>
  );
}

function TypeBadge({ type }) {
  return (
    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap ${type === 'employer' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}`}>
      {type === 'employer' ? 'Contratador' : 'Trabajador'}
    </span>
  );
}

function StatusBadges({ user }) {
  if (!user.is_banned && !user.is_admin && !user.is_premium) {
    return <span className="text-slate-300 text-[10px] font-bold uppercase">Activo</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {user.is_banned && (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 uppercase whitespace-nowrap">
          <ShieldAlert size={10} /> Baneado
        </span>
      )}
      {user.is_premium && (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 uppercase whitespace-nowrap">
          Premium
        </span>
      )}
    </div>
  );
}
