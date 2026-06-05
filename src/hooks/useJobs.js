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
      // Desambiguar la relación: existe más de una FK jobs↔users (la directa y la
      // de job_alerts_sent), así que hay que nombrar la constraint explícitamente
      // o PostgREST falla con PGRST201 y no devuelve ningún trabajo.
      .select('*, employer:users!jobs_user_id_fkey(full_name, email)')
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

  // Actualiza campos arbitrarios del trabajo (edición / aprobación desde el admin).
  // Devuelve true si tuvo éxito para que la UI pueda cerrar el formulario.
  const updateJob = async (id, fields) => {
    const { error } = await supabase.from('jobs').update(fields).eq('id', id);
    if (error) { setError(error.message); return false; }
    await fetchJobs();
    return true;
  };

  const deleteJob = async (id) => {
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) { setError(error.message); return; }
    await fetchJobs();
  };

  useEffect(() => { fetchJobs(); }, []);

  return { jobs, loading, error, fetchJobs, updateStatus, updateJob, deleteJob };
}
