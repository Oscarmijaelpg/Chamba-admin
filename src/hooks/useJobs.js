import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('jobs')
      .select('*, employer:users(full_name, email)')
      .order('created_at', { ascending: false });
    if (!error) setJobs(data || []);
    setLoading(false);
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', id);
    if (!error) await fetchJobs();
  };

  const deleteJob = async (id) => {
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (!error) await fetchJobs();
  };

  useEffect(() => { fetchJobs(); }, []);

  return { jobs, loading, fetchJobs, updateStatus, deleteJob };
}
