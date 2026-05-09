import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

function relTime(isoString) {
  const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  return mins < 60 ? `hace ${mins} min` : `hace ${Math.floor(mins / 60)}h`;
}

export function useDashboard(user) {
  const [stats, setStats] = useState({ users: 0, chambas: 0, revenue: 0, commission: 0, reports: 0 });
  const [pendingTx, setPendingTx] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { count: usersCount },
        { count: chambasCount },
        { data: allTx },
        { data: payments },
        { count: reportsCount },
        { data: configData },
        { data: tx },
        { data: recentChambas },
        { data: recentUsers },
        { data: recentTxActivity },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('chambas').select('*', { count: 'exact', head: true }).neq('status', 'completed'),
        supabase.from('wallet_transactions').select('amount').eq('type', 'deposit').eq('status', 'completed'),
        supabase.from('payments').select('amount').eq('status', 'released'),
        supabase.from('chamba_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('app_config').select('value').eq('id', 'global_settings').single(),
        supabase.from('wallet_transactions').select('*, users(full_name)').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('chambas').select('created_at').order('created_at', { ascending: false }).limit(1),
        supabase.from('users').select('created_at, is_verified').order('created_at', { ascending: false }).limit(1),
        supabase.from('wallet_transactions').select('type, created_at').in('type', ['deposit', 'withdrawal']).order('created_at', { ascending: false }).limit(1),
      ]);

      const commRate = configData?.value?.commission_rate || 10;
      const totalRevenue = allTx?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
      const totalCommission = payments?.reduce((acc, curr) => acc + (curr.amount * (commRate / 100)), 0) || 0;

      setStats({ users: usersCount || 0, chambas: chambasCount || 0, revenue: totalRevenue, commission: totalCommission, reports: reportsCount || 0 });
      setPendingTx(tx || []);

      const activities = [];
      if (recentChambas?.length) activities.push({ id: 1, text: 'Nueva chamba publicada', time: relTime(recentChambas[0].created_at), icon: 'briefcase' });
      if (recentUsers?.length) activities.push({ id: 2, text: recentUsers[0].is_verified ? 'Usuario verificado' : 'Nuevo usuario registrado', time: relTime(recentUsers[0].created_at), icon: 'user' });
      if (recentTxActivity?.length) activities.push({ id: 3, text: recentTxActivity[0].type === 'deposit' ? 'Depósito recibido' : 'Retiro procesado', time: relTime(recentTxActivity[0].created_at), icon: 'wallet' });

      setRecentActivity(activities.slice(0, 5));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
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

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  return { stats, pendingTx, recentActivity, loading, error, handleApprove, handleReject };
}
