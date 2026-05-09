import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAuditLogs(actionFilter, dateRange) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, user:users(full_name, email)')
        .order('created_at', { ascending: false });

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

      if (actionFilter !== 'all') {
        query = query.like('action', `${actionFilter}%`);
      }

      const { data, error } = await query.limit(200);
      if (!error) setLogs(data || []);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }, [actionFilter, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, refresh: fetchLogs };
}
