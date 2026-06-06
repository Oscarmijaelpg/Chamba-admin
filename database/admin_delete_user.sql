-- ─────────────────────────────────────────────────────────────────────────────
-- Eliminación permanente de usuarios desde el Admin
-- Proyecto Supabase: eavefhyizomclwmnaxcp
--
-- El admin usa el anon key, que NO puede tocar el schema `auth`. Para eliminar un
-- usuario "al 100%" (perfil de negocio + login) se usa esta función RPC
-- SECURITY DEFINER (corre como `postgres`), invocada con:
--   supabase.rpc('admin_delete_user', { target_id })
--
-- public.users y auth.users son tablas independientes (no hay FK entre ellas), por
-- eso hay que borrar de ambas. Las FK hacia public.users ya están en CASCADE/SET NULL,
-- así que el borrado del perfil arrastra chambas, postulaciones, billetera, mensajes…
-- y anonimiza pagos/reseñas/auditoría (SET NULL).
--
-- Aplicado en producción vía Management API. Se versiona aquí para dejar constancia.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Trigger de auditoría
--    - Corrige un bug preexistente: la rama `chambas` referenciaba NEW/OLD.worker_id,
--      columna inexistente (chambas usa employer_id) → rompía todo INSERT/UPDATE/DELETE
--      sobre chambas y, por ende, el borrado en cascada de cualquier empleador.
--    - Añade un short-circuit por `app.skip_audit`: permite suprimir la auditoría
--      durante una eliminación en cascada, evitando que el trigger AFTER DELETE de
--      chambas inserte filas en audit_logs que referencien al usuario que se borra
--      (lo que violaba la FK audit_logs.user_id -> users justo al final del DELETE).
CREATE OR REPLACE FUNCTION public.log_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_action      text;
  v_entity_type text;
  v_entity_id   uuid;
  v_details     jsonb;
  v_user_id     uuid;
BEGIN
  -- Permite suprimir la auditoría durante operaciones en cascada (p. ej. borrado de usuario)
  IF current_setting('app.skip_audit', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_entity_type := TG_TABLE_NAME;

  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
  ELSE
    v_entity_id := NEW.id;
  END IF;

  IF TG_TABLE_NAME = 'chambas' THEN
    IF TG_OP = 'INSERT' THEN
      v_action  := 'chamba.create';
      v_user_id := NEW.employer_id;
      v_details := jsonb_build_object('title', NEW.title, 'status', NEW.status::text);

    ELSIF TG_OP = 'DELETE' THEN
      v_action  := 'chamba.delete';
      v_user_id := OLD.employer_id;
      v_details := jsonb_build_object('title', OLD.title);

    ELSIF TG_OP = 'UPDATE' THEN
      v_user_id := NEW.employer_id;
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status::text = 'completed' THEN
          v_action := 'chamba.complete';
        ELSIF NEW.status::text IN ('cancelled', 'closed') THEN
          v_action := 'chamba.cancel';
        ELSE
          v_action := 'chamba.update';
        END IF;
        v_details := jsonb_build_object(
          'title', NEW.title,
          'old_status', OLD.status::text,
          'new_status', NEW.status::text
        );
      ELSE
        v_action  := 'chamba.update';
        v_details := jsonb_build_object('title', NEW.title);
      END IF;
    END IF;

  ELSIF TG_TABLE_NAME = 'wallet_transactions' THEN
    v_action := CASE
      WHEN NEW.type::text IN ('deposit', 'recharge')    THEN 'payment.deposit'
      WHEN NEW.type::text IN ('withdraw', 'withdrawal') THEN 'payment.withdraw'
      ELSE 'payment.deposit'
    END;
    v_user_id := NEW.user_id;
    v_details := jsonb_build_object(
      'amount', NEW.amount,
      'type',   NEW.type::text,
      'status', NEW.status::text
    );

  ELSIF TG_TABLE_NAME = 'payments' THEN
    v_user_id := NEW.employer_id;
    IF NEW.status::text = 'released' THEN
      v_action := 'payment.release';
    ELSIF NEW.status::text = 'refunded' THEN
      v_action := 'payment.refund';
    ELSE
      v_action := 'payment.release';
    END IF;
    v_details := jsonb_build_object(
      'amount',     NEW.amount,
      'old_status', OLD.status::text,
      'new_status', NEW.status::text
    );

  ELSIF TG_TABLE_NAME IN ('chamba_reports', 'alert_reports') THEN
    v_action  := 'report.create';
    v_user_id := NEW.reporter_id;
    v_details := jsonb_build_object(
      'reason',     NEW.reason::text,
      'table_name', TG_TABLE_NAME
    );

  ELSIF TG_TABLE_NAME = 'users' THEN
    v_user_id := NEW.id;
    IF OLD.is_banned IS DISTINCT FROM NEW.is_banned THEN
      IF NEW.is_banned THEN
        v_action := 'user.suspend';
      ELSE
        v_action := 'user.unsuspend';
      END IF;
      v_details := jsonb_build_object('is_banned', NEW.is_banned);
    ELSE
      RETURN NEW;
    END IF;

  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_action IS NOT NULL THEN
    INSERT INTO audit_logs(user_id, action, entity_type, entity_id, details)
    VALUES (v_user_id, v_action, v_entity_type, v_entity_id, v_details);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2) Eliminación permanente — solo administradores autenticados.
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- Solo administradores autenticados
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado: solo administradores pueden eliminar usuarios';
  END IF;

  -- Salvaguardas
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = target_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  IF EXISTS (SELECT 1 FROM public.users WHERE id = target_id AND is_admin = true) THEN
    RAISE EXCEPTION 'No se puede eliminar a otro administrador';
  END IF;

  -- Registrar la eliminación atribuida al admin que la ejecuta (antes de borrar)
  INSERT INTO public.audit_logs(user_id, action, entity_type, entity_id, details)
  VALUES (
    auth.uid(), 'user.delete', 'users', target_id,
    jsonb_build_object(
      'email',     (SELECT email FROM public.users WHERE id = target_id),
      'full_name', (SELECT full_name FROM public.users WHERE id = target_id)
    )
  );

  -- Suprimir la auditoría en cascada: evita que triggers AFTER DELETE (p. ej. chambas)
  -- inserten filas que referencien al usuario que se está borrando y violen la FK.
  PERFORM set_config('app.skip_audit', 'on', true);

  -- Borra el perfil de negocio (cascada) y el login/credenciales
  DELETE FROM public.users WHERE id = target_id;
  DELETE FROM auth.users  WHERE id = target_id;
END;
$function$;

REVOKE ALL  ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
REVOKE ALL  ON FUNCTION public.admin_delete_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
