-- ─────────────────────────────────────────────────────────────────────────────
-- Broadcast de push notifications movido al servidor (api/broadcast.js)
-- Proyecto Supabase: eavefhyizomclwmnaxcp
--
-- Antes el navegador bajaba TODOS los push_token, orquestaba el envío y limpiaba
-- tokens muertos. Ahora la función serverless usa el JWT del admin (sin service
-- role) y estos RPCs SECURITY DEFINER, gateados por is_admin():
--   - admin_notifiable_tokens()  → destinatarios (con token, no baneados, no borrados)
--   - admin_notifiable_count()   → cuántos son (para el modal de confirmación)
--   - admin_clear_push_tokens()  → limpia tokens muertos (DeviceNotRegistered)
--
-- Además se corrige una regresión del endurecimiento RLS: notification_logs había
-- quedado solo con INSERT de service_role, así que el log del broadcast (hecho por
-- el admin autenticado) fallaba. Se agrega política de INSERT para administradores.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_notifiable_tokens()
 RETURNS TABLE(id uuid, push_token text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN QUERY
    SELECT u.id, u.push_token FROM users u
    WHERE u.push_token IS NOT NULL
      AND coalesce(u.is_banned, false) = false
      AND u.deleted_at IS NULL;
END $$;

CREATE OR REPLACE FUNCTION public.admin_notifiable_count()
 RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN (SELECT count(*) FROM users
          WHERE push_token IS NOT NULL AND coalesce(is_banned, false) = false AND deleted_at IS NULL);
END $$;

CREATE OR REPLACE FUNCTION public.admin_clear_push_tokens(p_ids uuid[])
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE users SET push_token = NULL WHERE id = ANY(p_ids);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- Permisos
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.admin_notifiable_tokens()',
    'public.admin_notifiable_count()',
    'public.admin_clear_push_tokens(uuid[])'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;

-- Corrige la regresión: permitir que un admin autenticado registre el broadcast.
DROP POLICY IF EXISTS notification_logs_admin_insert ON public.notification_logs;
CREATE POLICY notification_logs_admin_insert ON public.notification_logs
  FOR INSERT TO authenticated WITH CHECK ((select public.is_admin()));
