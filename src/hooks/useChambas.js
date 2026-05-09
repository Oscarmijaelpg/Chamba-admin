import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useChambas() {
  const [chambas, setChambas] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChambas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chambas')
      .select('*, employer:users(full_name)')
      .order('created_at', { ascending: false });
    if (!error) setChambas(data || []);
    setLoading(false);
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('chambas').update({ status: newStatus }).eq('id', id);
    if (!error) await fetchChambas();
  };

  const deleteChamba = async (id) => {
    const { error } = await supabase.from('chambas').delete().eq('id', id);
    if (!error) await fetchChambas();
  };

  useEffect(() => { fetchChambas(); }, []);

  return { chambas, loading, fetchChambas, updateStatus, deleteChamba };
}
