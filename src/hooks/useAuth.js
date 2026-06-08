import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true); // resolviendo la sesión
  const [adminChecked, setAdminChecked] = useState(false); // resuelto el check de is_admin

  // 1) Sesión. El callback de onAuthStateChange DEBE ser síncrono: hacer await/llamadas
  //    al SDK aquí dentro deadlockea el cliente de auth de Supabase (se ve como pantalla
  //    colgada solo cuando hay sesión persistida). Por eso solo seteamos el user.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2) is_admin se consulta en un efecto separado (fuera del callback de auth) para no
  //    bloquear el cliente. Reacciona al cambio de usuario.
  useEffect(() => {
    let active = true;

    if (!user) {
      setIsAdmin(false);
      setAdminChecked(true);
      return;
    }

    setAdminChecked(false);
    supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        setIsAdmin(!error && data?.is_admin === true);
        setAdminChecked(true);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const signOut = () => supabase.auth.signOut();

  // `loading` cubre hasta tener sesión y, si hay usuario, el resultado del check de admin
  // (evita un parpadeo de "Acceso restringido" mientras se consulta).
  return { user, isAdmin, loading: loading || (!!user && !adminChecked), signOut };
}
