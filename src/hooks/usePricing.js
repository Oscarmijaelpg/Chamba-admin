import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pricing_config')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) setPlans(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const updatePlan = async (id, fields) => {
    const { error } = await supabase
      .from('pricing_config')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) fetchPlans();
    return !error;
  };

  return { plans, loading, updatePlan, refetch: fetchPlans };
}
