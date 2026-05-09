import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('jobs')
      .select('*, employer:users(full_name, email)')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setJobs(data || []);
    setLoading(false);
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', id);
    if (error) { setError(error.message); return; }
    await fetchJobs();
  };

  const deleteJob = async (id) => {
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) { setError(error.message); return; }
    await fetchJobs();
  };

  useEffect(() => { fetchJobs(); }, []);

  return { jobs, loading, error, fetchJobs, updateStatus, deleteJob };
}
