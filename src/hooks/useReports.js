import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useReports(filter) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chamba_reports')
      .select('*, reporter:users!reporter_id(full_name), chamba:chambas!chamba_id(title, status, employer_id)')
      .eq('status', filter)
      .order('created_at', { ascending: false });
    if (!error) setReports(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const resolveReport = async (reportId, chambaId, deleteChamba) => {
    if (deleteChamba) {
      await supabase.from('chambas').delete().eq('id', chambaId);
    }
    await supabase.from('chamba_reports').update({ status: 'resolved' }).eq('id', reportId);
    fetchReports();
  };

  return { reports, loading, resolveReport };
}
