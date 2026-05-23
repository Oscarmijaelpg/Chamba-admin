import React, { useState } from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Wallet,
  Settings,
  LogOut,
  Search,
  Bell,
  AlertTriangle,
  Shield,
  CreditCard,
  TrendingUp,
  Menu,
  X
} from 'lucide-react';

import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import UsersTable from './components/UsersTable';
import ChambasTable from './components/ChambasTable';
import FinanceView from './components/FinanceView';
import SettingsView from './components/SettingsView';
import ReportsView from './components/ReportsView';
import AuditLogsView from './components/AuditLogsView';
import PricingView from './components/PricingView';
import JobsTable from './components/JobsTable';
import AnalyticsCharts from './components/AnalyticsCharts';
import AlertsConfig from './components/AlertsConfig';
import DarkModeToggle from './components/DarkModeToggle';
import { useAuth } from './hooks/useAuth';

const NAV_ITEMS = [
  { path: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/users',      icon: Users,           label: 'Usuarios' },
  { path: '/chambas',    icon: Briefcase,       label: 'Chambas' },
  { path: '/jobs',       icon: Briefcase,       label: 'Trabajos' },
  { path: '/wallet',     icon: Wallet,          label: 'Finanzas' },
  { path: '/reports',    icon: AlertTriangle,   label: 'Reportes' },
  { path: '/audit',      icon: Shield,          label: 'Auditoría' },
  { path: '/analytics',  icon: TrendingUp,      label: 'Analytics' },
  { path: '/alerts',     icon: Bell,            label: 'Alertas' },
  { path: '/pricing',    icon: CreditCard,      label: 'Precios' },
  { path: '/settings',   icon: Settings,        label: 'Ajustes' },
];

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
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

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen z-30
        w-64 bg-white border-r border-slate-200 flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-black text-primary-600 tracking-tighter">
            CHAMBA <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block">Admin Dash</span>
          </h1>
          <button onClick={closeSidebar} className="md:hidden p-1 text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-200'
                    : 'text-slate-500 hover:bg-slate-100'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <DarkModeToggle />
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-4 py-3 text-red-500 font-medium w-full hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={20} />
            Salir
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

          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar usuarios, transacciones..."
              className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <NavLink
              to="/reports"
              className="p-3 bg-white rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
            >
              <Bell size={20} />
            </NavLink>
            <div className="hidden sm:flex items-center gap-3 bg-white p-2 pr-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                {(user?.email?.[0] ?? 'A').toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 max-w-[120px] truncate">{user?.email ?? 'Admin'}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardView user={user} />} />
          <Route path="/users" element={<UsersTable />} />
          <Route path="/chambas" element={<ChambasTable />} />
          <Route path="/jobs" element={<JobsTable />} />
          <Route path="/wallet" element={<FinanceView />} />
          <Route path="/reports" element={<ReportsView />} />
          <Route path="/audit" element={<AuditLogsView />} />
          <Route path="/analytics" element={
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Analytics Avanzado</h2>
                <p className="text-slate-500">Tendencias, distribución de eventos, y métricas clave</p>
              </div>
              <AnalyticsCharts />
            </div>
          } />
          <Route path="/alerts" element={
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Configuración de Alertas</h2>
                <p className="text-slate-500">Gestiona notificaciones por email y preferencias</p>
              </div>
              <AlertsConfig />
            </div>
          } />
          <Route path="/pricing" element={<PricingView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
