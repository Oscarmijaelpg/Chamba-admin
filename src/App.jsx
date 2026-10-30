import React, { useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Wallet,
  Settings,
  LogOut,
  Bell,
  AlertTriangle,
  Shield,
  TrendingUp,
  Scale,
  Link2,
  Eye,
  Menu,
  X,
  Building2,
} from 'lucide-react';

import LoginView from './components/LoginView';
import DarkModeToggle from './components/DarkModeToggle';
import NotificationsBell from './components/NotificationsBell';
import { useAuth } from './hooks/useAuth';

// Vistas cargadas bajo demanda (code-splitting por ruta): cada una es su propio
// chunk, así recharts y demás no entran al bundle inicial hasta visitar su vista.
const DashboardView = lazy(() => import('./components/DashboardView'));
const UsersTable = lazy(() => import('./components/UsersTable'));
const ChambasTable = lazy(() => import('./components/ChambasTable'));
const FinanceView = lazy(() => import('./components/FinanceView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const ReportsView = lazy(() => import('./components/ReportsView'));
const DisputesView = lazy(() => import('./components/DisputesView'));
const AuditLogsView = lazy(() => import('./components/AuditLogsView'));
const JobsTable = lazy(() => import('./components/JobsTable'));
const AnalyticsView = lazy(() => import('./components/AnalyticsView'));
const AlertsConfig = lazy(() => import('./components/AlertsConfig'));
const ActivityView = lazy(() => import('./components/ActivityView'));
const TrackedLinksView = lazy(() => import('./components/TrackedLinksView'));
const ContentViewsView = lazy(() => import('./components/ContentViewsView'));

// Fallback mientras carga el chunk de la vista.
const RouteFallback = () => (
  <div className="flex items-center justify-center py-24 text-slate-400">
    <div className="w-7 h-7 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Menú agrupado por tarea: qué se publica, la plata, la moderación y los números.
const NAV_GROUPS = [
  {
    label: 'General',
    items: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/users',     icon: Users,           label: 'Usuarios' },
    ],
  },
  {
    label: 'Publicaciones',
    items: [
      { path: '/chambas', icon: Briefcase, label: 'Chambas' },
      { path: '/jobs',    icon: Building2, label: 'Trabajos' },
    ],
  },
  {
    label: 'Dinero',
    items: [
      { path: '/wallet',   icon: Wallet, label: 'Finanzas' },
      { path: '/disputas', icon: Scale,  label: 'Disputas' },
    ],
  },
  {
    label: 'Moderación',
    items: [
      { path: '/reports', icon: AlertTriangle, label: 'Reportes' },
      { path: '/audit',   icon: Shield,        label: 'Auditoría' },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
      { path: '/vistas',    icon: Eye,        label: 'Vistas' },
      { path: '/enlaces',   icon: Link2,      label: 'Enlaces' },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { path: '/alerts',   icon: Bell,     label: 'Alertas' },
      { path: '/settings', icon: Settings, label: 'Ajustes' },
    ],
  },
];

export default function App() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  // Solo administradores (public.users.is_admin = true) acceden al panel.
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 max-w-sm w-full text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-red-50 flex items-center justify-center">
            <Shield size={24} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Acceso restringido</h2>
            <p className="text-sm text-slate-500 mt-1">
              La cuenta <span className="font-medium">{user?.email}</span> no tiene permisos de
              administrador.
            </p>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar: fondo oscuro de marca para que el verde contraste; el ítem
          activo va como el CTA de la app (verde con texto oscuro). */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen z-30
        w-64 bg-dark text-slate-300 flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="px-5 pt-6 pb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <span className="text-dark font-black text-sm tracking-tight">C2</span>
            </div>
            <div className="leading-tight">
              <p className="text-white font-black text-lg tracking-tight">Conecta2</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary-400">Panel admin</p>
            </div>
          </div>
          <button onClick={closeSidebar} className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 pb-4 overflow-y-auto space-y-5 [scrollbar-width:thin]">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeSidebar}
                    className={({ isActive }) =>
                      `group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                        isActive
                          ? 'bg-primary-500 text-dark font-bold shadow-lg shadow-primary-500/20'
                          : 'text-slate-300 font-medium hover:bg-white/[0.06] hover:text-white'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={18} className={isActive ? 'text-dark' : 'text-slate-500 group-hover:text-primary-400 transition-colors'} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-primary-400 font-bold text-sm shrink-0">
              {(user?.email?.[0] ?? 'A').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user?.email ?? 'Admin'}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Super admin</p>
            </div>
            <DarkModeToggle className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition" />
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-400 font-medium w-full hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
        <header className="flex items-center gap-3 mb-6 md:mb-10">
          {/* Hamburger mobile */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all shrink-0"
          >
            <Menu size={20} />
          </button>

          {/* La búsqueda vive dentro de cada vista (Usuarios, Trabajos, …),
              resuelta en el servidor. Aquí sólo dejamos el espaciado del header. */}
          <div className="flex-1" />

          <div className="flex items-center gap-2 shrink-0">
            <NotificationsBell userId={user?.id} />
          </div>
        </header>

        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardView user={user} />} />
          <Route path="/users" element={<UsersTable />} />
          <Route path="/chambas" element={<ChambasTable />} />
          <Route path="/jobs" element={<JobsTable />} />
          <Route path="/wallet" element={<FinanceView />} />
          <Route path="/disputas" element={<DisputesView />} />
          <Route path="/reports" element={<ReportsView />} />
          <Route path="/audit" element={<AuditLogsView />} />
          <Route path="/activity" element={<ActivityView />} />
          <Route path="/enlaces" element={<TrackedLinksView />} />
          <Route path="/vistas" element={<ContentViewsView />} />
          <Route path="/analytics" element={<AnalyticsView />} />
          <Route path="/alerts" element={
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Configuración de Alertas</h2>
                <p className="text-slate-500">Avisos del panel y notificaciones a los usuarios</p>
              </div>
              <AlertsConfig userId={user?.id} />
            </div>
          } />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </Suspense>
      </main>
    </div>
  );
}
