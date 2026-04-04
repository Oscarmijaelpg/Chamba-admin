import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Wallet, 
  Settings, 
  LogOut, 
  Search, 
  Bell,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Shield,
  CreditCard
} from 'lucide-react';

// Auth
import LoginView from './components/LoginView';

// Vistas
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
import TableSearch from './components/TableSearch';
import TableActions from './components/TableActions';
import ModerationModal from './components/ModerationModal';
import DarkModeToggle from './components/DarkModeToggle';

// Componentes Simples
const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold mt-2 text-slate-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingTx, setPendingTx] = useState([]);
  const [stats, setStats] = useState({ users: 0, chambas: 0, revenue: 0, commission: 0, reports: 0 });
  const [recentActivity, setRecentActivity] = useState([]);
  const [moderationModal, setModerationModal] = useState({ isOpen: false, item: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Usuarios totales
      const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      
      // Chambas abiertas o en progreso
      const { count: chambasCount } = await supabase.from('chambas').select('*', { count: 'exact', head: true }).neq('status', 'completed');
      
      // Calcular volumen total (suma de depósitos completados)
      const { data: allTx } = await supabase.from('wallet_transactions').select('amount').eq('type', 'deposit').eq('status', 'completed');
      const totalRevenue = allTx?.reduce((acc, curr) => acc + curr.amount, 0) || 0;

      // Calcular ganancias de la app (comisiones de pagos liberados)
      const { data: payments } = await supabase.from('payments').select('amount').eq('status', 'released');
      
      const { count: reportsCount } = await supabase.from('chamba_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');

      // Obtener comisión actual de config
      const { data: configData } = await supabase.from('app_config').select('value').eq('id', 'global_settings').single();
      const commRate = configData?.value?.commission_rate || 10;
      
      const totalCommission = payments?.reduce((acc, curr) => acc + (curr.amount * (commRate / 100)), 0) || 0;

      const { data: tx } = await supabase.from('wallet_transactions')
        .select('*, users(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      setStats({ 
        users: usersCount || 0, 
        chambas: chambasCount || 0, 
        revenue: totalRevenue,
        commission: totalCommission,
        reports: reportsCount || 0
      });
      setPendingTx(tx || []);

      // Fetch recent activity from multiple tables
      const activities = [];

      // Recent chambas
      const { data: recentChambas } = await supabase
        .from('chambas')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      if (recentChambas?.length) {
        const diff = Date.now() - new Date(recentChambas[0].created_at).getTime();
        const mins = Math.floor(diff / 60000);
        activities.push({ id: 1, text: "Nueva chamba publicada", time: mins < 60 ? `hace ${mins} min` : `hace ${Math.floor(mins/60)}h`, icon: 'briefcase' });
      }

      // Recent users
      const { data: recentUsers } = await supabase
        .from('users')
        .select('created_at, is_verified')
        .order('created_at', { ascending: false })
        .limit(1);
      if (recentUsers?.length) {
        const diff = Date.now() - new Date(recentUsers[0].created_at).getTime();
        const mins = Math.floor(diff / 60000);
        activities.push({ id: 2, text: recentUsers[0].is_verified ? "Usuario verificado" : "Nuevo usuario registrado", time: mins < 60 ? `hace ${mins} min` : `hace ${Math.floor(mins/60)}h`, icon: 'user' });
      }

      // Recent wallet transactions
      const { data: recentTx } = await supabase
        .from('wallet_transactions')
        .select('type, created_at')
        .in('type', ['deposit', 'withdrawal'])
        .order('created_at', { ascending: false })
        .limit(1);
      if (recentTx?.length) {
        const diff = Date.now() - new Date(recentTx[0].created_at).getTime();
        const mins = Math.floor(diff / 60000);
        activities.push({ id: 3, text: recentTx[0].type === 'deposit' ? "Depósito recibido" : "Retiro procesado", time: mins < 60 ? `hace ${mins} min` : `hace ${Math.floor(mins/60)}h`, icon: 'wallet' });
      }

      setRecentActivity(activities.slice(0, 5));
    } catch (e) {
      console.error('Error fetching dashboard stats:', e);
    }
  };

  const handleApprove = async (id) => {
    const { error } = await supabase.from('wallet_transactions').update({ status: 'completed' }).eq('id', id);
    if (!error) fetchDashboardData();
  };

  const handleReject = async (id) => {
    if (!window.confirm('¿Rechazar esta transacción?')) return;
    const { error } = await supabase.from('wallet_transactions').update({ status: 'failed' }).eq('id', id);
    if (!error) fetchDashboardData();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard title="Total Usuarios" value={stats.users} icon={Users} color="bg-blue-500" />
              <StatCard title="Chambas Activas" value={stats.chambas} icon={Briefcase} color="bg-primary-500" />
              <StatCard title="Volumen Pagos" value={`Bs. ${stats.revenue.toLocaleString()}`} icon={TrendingUp} color="bg-indigo-500" />
              <StatCard title="Ganancia App" value={`Bs. ${stats.commission.toLocaleString()}`} icon={Wallet} color="bg-amber-500" />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Transactions Table */}
              <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                  <h2 className="font-bold text-lg">Recargas Pendientes</h2>
                  <button onClick={() => setActiveTab('wallet')} className="text-primary-600 text-sm font-bold hover:underline">Ver Todo</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                        <th className="px-6 py-4">Usuario</th>
                        <th className="px-6 py-4">Monto</th>
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {pendingTx.length > 0 ? pendingTx.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800 text-sm">{tx.users?.full_name}</p>
                            <p className="text-xs text-slate-400">{tx.type === 'deposit' ? 'Depósito' : 'Retiro'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-bold text-slate-800">Bs. {tx.amount}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-sm">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleApprove(tx.id)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-all" title="Aprobar"><CheckCircle2 size={18} /></button>
                              <button onClick={() => handleReject(tx.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Rechazar"><XCircle size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-400 italic">No hay recargas pendientes.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                <h2 className="font-bold text-lg mb-6">Actividad Reciente</h2>
                <div className="space-y-6">
                  {recentActivity.length > 0 ? recentActivity.map(item => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        {item.icon === 'briefcase' && <Briefcase size={16} />}
                        {item.icon === 'user' && <Users size={16} />}
                        {item.icon === 'wallet' && <Wallet size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.text}</p>
                        <p className="text-[11px] text-slate-400 mt-1">{item.time}</p>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-400 italic">Sin actividad reciente</p>
                  )}
                </div>
                <button className="w-full mt-8 py-3 bg-slate-50 text-slate-500 text-sm font-bold rounded-xl hover:bg-slate-100 transition-all">
                  Ver Todo el Registro
                </button>
              </div>
            </div>
          </div>
        );
      case 'users':
        return <UsersTable />;
      case 'chambas':
        return <ChambasTable />;
      case 'wallet':
        return <FinanceView />;
      case 'reports':
        return <ReportsView />;
      case 'audit':
        return <AuditLogsView />;
      case 'pricing':
        return <PricingView />;
      case 'jobs':
        return <JobsTable />;
      case 'analytics':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Analytics Avanzado</h2>
              <p className="text-slate-500">Tendencias, distribución de eventos, y métricas clave</p>
            </div>
            <AnalyticsCharts />
          </div>
        );
      case 'alerts':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Configuración de Alertas</h2>
              <p className="text-slate-500">Gestiona notificaciones por email y preferencias</p>
            </div>
            <AlertsConfig />
          </div>
        );
      case 'settings':
        return <SettingsView />;
      default:
        return null;
    }
  };

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

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen">
        <div className="p-8">
          <h1 className="text-2xl font-black text-primary-600 tracking-tighter">CHAMBA <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block">Admin Dash</span></h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'users', icon: Users, label: 'Usuarios' },
            { id: 'chambas', icon: Briefcase, label: 'Chambas' },
            { id: 'jobs', icon: Briefcase, label: 'Trabajos' },
            { id: 'wallet', icon: Wallet, label: 'Finanzas' },
            { id: 'reports', icon: AlertTriangle, label: 'Reportes' },
            { id: 'audit', icon: Shield, label: 'Auditoría' },
            { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
            { id: 'alerts', icon: Bell, label: 'Alertas' },
            { id: 'pricing', icon: CreditCard, label: 'Precios' },
            { id: 'settings', icon: Settings, label: 'Ajustes' },
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === item.id ? 'bg-primary-500 text-white shadow-lg shadow-primary-200' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-3">
          <DarkModeToggle />
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-3 px-4 py-3 text-red-500 font-medium w-full hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={20} />
            Salir
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Top Bar */}
        <header className="flex justify-between items-center mb-10">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar usuarios, transacciones..." className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all shadow-sm" />
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('reports')}
              className="p-3 bg-white rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all relative"
            >
              <Bell size={20} />
              {stats.reports > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <div className="flex items-center gap-3 ml-4 bg-white p-2 pr-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white font-bold">M</div>
              <div>
                <p className="text-sm font-bold text-slate-800">Mijael</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}
