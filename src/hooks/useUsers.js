import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const setBanned = async (userId, isBanned) => {
    const { error } = await supabase
      .from('users')
      .update({ is_banned: isBanned })
      .eq('id', userId);
    if (!error) fetchUsers();
    return error;
  };

  return { users, loading, setBanned };
}
