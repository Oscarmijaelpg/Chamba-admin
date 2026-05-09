import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAnalytics() {
  const [userTrend, setUserTrend] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [eventStats, setEventStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      supabase.from('analytics_events').select('event_name, created_at').gte('created_at', thirtyDaysAgo),
      supabase.from('wallet_transactions').select('amount, created_at').eq('type', 'deposit').gte('created_at', thirtyDaysAgo),
    ]).then(([{ data: events }, { data: txs }]) => {
      const eventsByDate = {};
      const eventCounts = {};
      events?.forEach(event => {
        const date = new Date(event.created_at).toLocaleDateString();
        eventsByDate[date] = (eventsByDate[date] || 0) + 1;
        eventCounts[event.event_name] = (eventCounts[event.event_name] || 0) + 1;
      });
      setUserTrend(Object.entries(eventsByDate).map(([date, count]) => ({ date, users: count })));
      setEventStats(Object.entries(eventCounts).map(([name, count]) => ({ name, value: count })));

      const revByDate = {};
      txs?.forEach(tx => {
        const date = new Date(tx.created_at).toLocaleDateString();
        revByDate[date] = (revByDate[date] || 0) + tx.amount;
      });
      setRevenueTrend(Object.entries(revByDate).map(([date, revenue]) => ({ date, revenue })));
    }).finally(() => setLoading(false));
  }, []);

  return { userTrend, revenueTrend, eventStats, loading };
}
