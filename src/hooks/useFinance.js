import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useFinance(filter) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    let query = supabase
      .from('wallet_transactions')
      .select('*, users(full_name, email)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') query = query.eq('status', filter);

    const { data, error } = await query;
    if (!error) setTransactions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const approveTransaction = async (id) => {
    const { error } = await supabase
      .from('wallet_transactions')
      .update({ status: 'completed' })
      .eq('id', id);
    if (!error) fetchTransactions();
  };

  const rejectTransaction = async (id) => {
    const { error } = await supabase
      .from('wallet_transactions')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (!error) fetchTransactions();
  };

  return { transactions, loading, approveTransaction, rejectTransaction };
}
