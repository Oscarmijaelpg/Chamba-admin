import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../lib/supabase';

export default function AnalyticsCharts() {
  const [userTrend, setUserTrend] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [eventStats, setEventStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Get last 30 days of user registrations
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: events } = await supabase
        .from('analytics_events')
        .select('event_name, created_at')
        .gte('created_at', thirtyDaysAgo);

      // Process events by date
      const eventsByDate = {};
      const eventCounts = {};

      events?.forEach(event => {
        const date = new Date(event.created_at).toLocaleDateString();
        eventsByDate[date] = (eventsByDate[date] || 0) + 1;
        eventCounts[event.event_name] = (eventCounts[event.event_name] || 0) + 1;
      });

      setUserTrend(
        Object.entries(eventsByDate).map(([date, count]) => ({ date, users: count }))
      );

      setEventStats(
        Object.entries(eventCounts).map(([name, count]) => ({ name, value: count }))
      );

      // Get revenue trend
      const { data: txs } = await supabase
        .from('wallet_transactions')
        .select('amount, created_at')
        .eq('type', 'deposit')
        .gte('created_at', thirtyDaysAgo);

      const revByDate = {};
      txs?.forEach(tx => {
        const date = new Date(tx.created_at).toLocaleDateString();
        revByDate[date] = (revByDate[date] || 0) + tx.amount;
      });

      setRevenueTrend(
        Object.entries(revByDate).map(([date, revenue]) => ({ date, revenue }))
      );

      setLoading(false);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      setLoading(false);
    }
  };

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) return <div className="text-center py-8 text-slate-500">Cargando datos...</div>;

  return (
    <div className="space-y-6">
      {/* User Trend */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Usuarios por Día (Últimos 30 días)</h3>
        {userTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="users" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500">Sin datos</p>
        )}
      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Ingresos por Día (Últimos 30 días)</h3>
        {revenueTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500">Sin datos</p>
        )}
      </div>

      {/* Event Distribution */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Distribución de Eventos</h3>
        {eventStats.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={eventStats} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                {eventStats.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500">Sin datos</p>
        )}
      </div>
    </div>
  );
}
