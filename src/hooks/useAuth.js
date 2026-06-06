import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Carga el flag is_admin desde public.users para el usuario autenticado.
async function fetchIsAdmin(authUser) {
  if (!authUser) return false;
  const { data, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', authUser.id)
    .single();
  if (error) return false;
  return data?.is_admin === true;
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth
      .getUser()
      .then(async ({ data: { user } }) => {
        if (!active) return;
        const admin = await fetchIsAdmin(user);
        if (!active) return;
        setUser(user);
        setIsAdmin(admin);
        setLoading(false);
      })
      .catch(() => active && setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authUser = session?.user ?? null;
      const admin = await fetchIsAdmin(authUser);
      if (!active) return;
      setUser(authUser);
      setIsAdmin(admin);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = () => supabase.auth.signOut();

  return { user, isAdmin, loading, signOut };
}
