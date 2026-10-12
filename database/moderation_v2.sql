-- ════════════════════════════════════════════════════════════════════════════
-- MODERACIÓN v2: baneo que se cumple en el servidor, historial, moderación
-- directa (sin reporte), aviso al denunciante y WhatsApp desde el registro
-- ════════════════════════════════════════════════════════════════════════════
--
-- Estado de la base antes de esta migración (introspección del 2026-10-12):
--
--   * `reports` NO tenía `resolved_by` ni `resolved_at`, pero las dos RPC del
--     panel (`admin_reports_list`, `admin_resolve_report`) las usaban: la lista
--     de reportes y toda resolución fallaban con "column does not exist". La
--     moderación del panel no funcionaba.
--   * `is_banned` no se hacía cumplir para ninguna escritura: solo la app móvil
--     deslogueaba al baneado. Desde la web seguía publicando y postulando.
--   * Un dueño podía volver a `open` una chamba removida por moderación (la
--     política `employers_update_chambas` le deja cambiar el status).
--   * Cualquier usuario autenticado podía fabricar un aviso de tipo `moderation`
--     a otro (INSERT abierto en `notifications`).
--
-- Lo que NO hacía falta: la política `users_update` ya impide que alguien se
-- cambie `is_banned` o `is_admin` a sí mismo.
--
-- Todo es aditivo. Las apps publicadas (1.0.29 / 1.0.37) siguen funcionando:
-- ocultar avisos se hace por `status` (deleted / rejected), que es por lo que ya
-- filtran todos los lectores.
-- Idempotente. Se aplica vía Management API (proyecto eavefhyizomclwmnaxcp).

-- ── 1. Columnas ─────────────────────────────────────────────────────────────
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved_by uuid;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Respaldo del estado previo para poder restaurar al desbanear.
--   hidden_reason: 'moderation'   → se removió este aviso puntual
--                  'owner_banned' → se ocultó porque suspendieron al dueño
ALTER TABLE public.chambas ADD COLUMN IF NOT EXISTS hidden_prev_status text;
ALTER TABLE public.chambas ADD COLUMN IF NOT EXISTS hidden_reason text;
ALTER TABLE public.chambas ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS hidden_prev_status text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS hidden_reason text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

-- ── 2. Historial de moderación ──────────────────────────────────────────────
-- Una fila por acción, exista o no un reporte detrás. El motivo de una
-- suspensión vive acá y no en `users`, porque esa tabla es de lectura pública.
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  action         text NOT NULL CHECK (action IN ('warn','remove_content','ban','unban')),
  entity_type    text CHECK (entity_type IS NULL OR entity_type IN ('user','chamba','job','alert')),
  entity_id      uuid,
  entity_title   text,
  report_id      uuid,
  message        text,
  notified       boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS moderation_actions_target_idx
  ON public.moderation_actions (target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_actions_entity_idx
  ON public.moderation_actions (entity_type, entity_id);

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS moderation_actions_select_admin ON public.moderation_actions;
CREATE POLICY moderation_actions_select_admin ON public.moderation_actions
  FOR SELECT TO authenticated USING ((select public.is_admin()));
-- Sin políticas de escritura: solo escriben las RPC (SECURITY DEFINER).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.moderation_actions FROM anon, authenticated;

-- ── 3. El baneo se cumple en la base ────────────────────────────────────────
-- Triggers y no políticas: funcionan igual sea cual sea la RLS de cada tabla y
-- devuelven un error con nombre propio (`ACCOUNT_SUSPENDED`) que los clientes
-- pueden reconocer.
--
-- Con `auth.uid()` nulo (scraper, cron, service role) no se evalúa nada.
--
-- Sin SECURITY DEFINER a propósito: así `current_user` dice quién escribe de
-- verdad (`authenticated` si es el cliente, `postgres` si es una RPC del
-- servidor). El dato del baneo se lee con `get_own_is_banned()`, que sí es
-- definer y no depende de la RLS de `users`.
CREATE OR REPLACE FUNCTION public.enforce_not_banned()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF (select auth.uid()) IS NULL THEN
    RETURN NEW;
  END IF;
  -- TG_ARGV[0] = 'client_only': la regla vale solo para escrituras directas del
  -- cliente. Se usa donde una RPC del servidor escribe en nombre del usuario
  -- (mensajes de sistema, liberar un pago) y no debe trabarse.
  IF TG_NARGS > 0 AND TG_ARGV[0] = 'client_only' AND current_user NOT IN ('anon','authenticated') THEN
    RETURN NEW;
  END IF;
  IF public.get_own_is_banned() THEN
    RAISE EXCEPTION 'ACCOUNT_SUSPENDED' USING ERRCODE = 'P0001',
      HINT = 'La cuenta está suspendida y no puede publicar ni interactuar.';
  END IF;
  RETURN NEW;
END $function$;

DO $$
DECLARE t text;
BEGIN
  -- INSERT: nadie suspendido crea contenido, venga por donde venga.
  FOREACH t IN ARRAY ARRAY['chambas','jobs','alerts','applications','reviews','alert_comments','offers','reports'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_not_banned_ins ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_enforce_not_banned_ins BEFORE INSERT ON public.%I
                    FOR EACH ROW EXECUTE FUNCTION public.enforce_not_banned()', t);
  END LOOP;
  -- Mensajes de chat y ediciones: solo escrituras directas del cliente.
  DROP TRIGGER IF EXISTS trg_enforce_not_banned_ins ON public.messages;
  CREATE TRIGGER trg_enforce_not_banned_ins BEFORE INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.enforce_not_banned('client_only');
  FOREACH t IN ARRAY ARRAY['chambas','jobs','alerts'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_not_banned_upd ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_enforce_not_banned_upd BEFORE UPDATE ON public.%I
                    FOR EACH ROW EXECUTE FUNCTION public.enforce_not_banned(''client_only'')', t);
  END LOOP;
END $$;

-- Un aviso removido por moderación no lo reactiva su dueño. Las columnas de
-- respaldo tampoco las toca un cliente (un admin sí, por si hay que corregir).
CREATE OR REPLACE FUNCTION public.chambas_protect_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user IN ('anon','authenticated') AND NOT public.is_admin() THEN
    NEW.hidden_prev_status := OLD.hidden_prev_status;
    NEW.hidden_reason      := OLD.hidden_reason;
    NEW.hidden_at          := OLD.hidden_at;
    IF OLD.hidden_reason IS NOT NULL THEN
      NEW.status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_chambas_protect_moderation ON public.chambas;
CREATE TRIGGER trg_chambas_protect_moderation BEFORE UPDATE ON public.chambas
  FOR EACH ROW EXECUTE FUNCTION public.chambas_protect_moderation();

-- Los avisos de moderación solo los emite el servidor. Las RPC de abajo prenden
-- `app.moderation` dentro de su transacción; un cliente no puede hacerlo.
CREATE OR REPLACE FUNCTION public.notifications_guard_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type = 'moderation' AND coalesce(current_setting('app.moderation', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Solo el equipo de moderación puede emitir este aviso.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_notifications_guard_moderation ON public.notifications;
CREATE TRIGGER trg_notifications_guard_moderation BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notifications_guard_moderation();

-- ── 4. Núcleo de moderación ─────────────────────────────────────────────────
-- Un solo lugar aplica la sanción, la registra y avisa. Lo usan la resolución de
-- reportes y la moderación directa. No valida permisos: eso lo hace quien llama.
CREATE OR REPLACE FUNCTION public._moderation_notify(
  p_user_id uuid, p_title text, p_body text, p_data jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id IS NULL THEN RETURN false; END IF;
  PERFORM set_config('app.moderation', 'on', true);
  BEGIN
    PERFORM public.notify_user(p_user_id, 'moderation', p_title, p_body, p_data);
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  RETURN true;
END $function$;

CREATE OR REPLACE FUNCTION public._moderation_apply(
  p_action text, p_entity_type text, p_entity_id uuid,
  p_message text DEFAULT NULL, p_notify boolean DEFAULT true, p_report_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $function$
DECLARE
  v_user uuid; v_title text; v_ent_status text;
  v_pay record; v_has_worker boolean;
  v_msg text := nullif(btrim(coalesce(p_message, '')), '');
  v_ntitle text; v_body text; v_notified boolean := false; v_action_id uuid;
  v_target_admin boolean;
BEGIN
  IF p_action NOT IN ('warn','remove_content','ban','unban') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'bad_action');
  END IF;
  IF p_entity_id IS NULL OR p_entity_type NOT IN ('user','chamba','job','alert') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'bad_target');
  END IF;

  -- El responsable se resuelve acá, nunca lo elige el cliente.
  IF p_entity_type = 'user' THEN
    SELECT id, full_name INTO v_user, v_title FROM public.users WHERE id = p_entity_id;
  ELSIF p_entity_type = 'chamba' THEN
    SELECT employer_id, title, status::text INTO v_user, v_title, v_ent_status
      FROM public.chambas WHERE id = p_entity_id FOR UPDATE;
  ELSIF p_entity_type = 'job' THEN
    SELECT user_id, title, status::text INTO v_user, v_title, v_ent_status
      FROM public.jobs WHERE id = p_entity_id FOR UPDATE;
  ELSE
    SELECT user_id, coalesce(nullif(company_name, ''), left(description, 80)) INTO v_user, v_title
      FROM public.alerts WHERE id = p_entity_id FOR UPDATE;
  END IF;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_found');
  END IF;

  IF p_action IN ('warn','ban','unban') AND v_user IS NULL THEN
    -- Empleo traído por el scraper: no hay cuenta a la que sancionar.
    RETURN jsonb_build_object('ok', false, 'code', 'no_owner');
  END IF;

  IF p_action = 'ban' THEN
    SELECT coalesce(is_admin, false) INTO v_target_admin FROM public.users WHERE id = v_user;
    IF v_target_admin THEN
      RETURN jsonb_build_object('ok', false, 'code', 'target_is_admin');
    END IF;
  END IF;

  IF p_action = 'remove_content' THEN
    IF p_entity_type = 'user' THEN
      RETURN jsonb_build_object('ok', false, 'code', 'bad_target');
    ELSIF p_entity_type = 'chamba' THEN
      IF v_ent_status <> 'deleted' THEN
        -- Plata en custodia: si ya hay trabajador elegido, esto es una disputa y
        -- no una remoción. Si no lo hay, se devuelve antes de ocultar.
        SELECT id, amount INTO v_pay FROM public.payments
         WHERE chamba_id = p_entity_id AND status = 'escrow' LIMIT 1 FOR UPDATE;
        IF FOUND THEN
          SELECT EXISTS (SELECT 1 FROM public.applications
                          WHERE chamba_id = p_entity_id AND status = 'accepted') INTO v_has_worker;
          IF v_has_worker THEN
            RETURN jsonb_build_object('ok', false, 'code', 'escrow_in_progress');
          END IF;
          UPDATE public.wallets SET held_balance = held_balance - v_pay.amount,
                                    balance = balance + v_pay.amount
           WHERE user_id = v_user;
          UPDATE public.payments SET status = 'refunded' WHERE id = v_pay.id;
          INSERT INTO public.wallet_transactions (user_id, amount, type, status, description, chamba_id)
            VALUES (v_user, v_pay.amount, 'refund', 'completed',
                    'Devolución por remoción de «' || coalesce(v_title, 'chamba') || '»', p_entity_id);
        END IF;
        UPDATE public.chambas
           SET hidden_prev_status = status::text, hidden_reason = 'moderation', hidden_at = now(),
               status = 'deleted'
         WHERE id = p_entity_id;
      END IF;
    ELSIF p_entity_type = 'job' THEN
      IF v_ent_status <> 'rejected' OR v_ent_status IS NULL THEN
        UPDATE public.jobs
           SET hidden_prev_status = status::text, hidden_reason = 'moderation', hidden_at = now(),
               status = 'rejected'
         WHERE id = p_entity_id;
      END IF;
    ELSE
      DELETE FROM public.alerts WHERE id = p_entity_id;
    END IF;

  ELSIF p_action = 'ban' THEN
    UPDATE public.users SET is_banned = true WHERE id = v_user;
    -- Se ocultan solo los avisos vigentes. Lo que está en curso o terminado
    -- queda como está para que la otra parte pueda cerrar o reclamar.
    UPDATE public.chambas
       SET hidden_prev_status = status::text, hidden_reason = 'owner_banned', hidden_at = now(),
           status = 'deleted'
     WHERE employer_id = v_user AND status = 'open';
    UPDATE public.jobs
       SET hidden_prev_status = status::text, hidden_reason = 'owner_banned', hidden_at = now(),
           status = 'rejected'
     WHERE user_id = v_user AND status IN ('open','active');

  ELSIF p_action = 'unban' THEN
    UPDATE public.users SET is_banned = false WHERE id = v_user;
    UPDATE public.chambas
       SET status = hidden_prev_status::chamba_status_enum,
           hidden_prev_status = NULL, hidden_reason = NULL, hidden_at = NULL
     WHERE employer_id = v_user AND hidden_reason = 'owner_banned' AND status = 'deleted';
    UPDATE public.jobs
       SET status = hidden_prev_status::job_status_enum,
           hidden_prev_status = NULL, hidden_reason = NULL, hidden_at = NULL
     WHERE user_id = v_user AND hidden_reason = 'owner_banned' AND status = 'rejected';
  END IF;

  IF p_notify AND v_user IS NOT NULL THEN
    v_ntitle := CASE p_action
      WHEN 'ban'            THEN 'Tu cuenta fue suspendida'
      WHEN 'unban'          THEN 'Tu cuenta fue reactivada'
      WHEN 'remove_content' THEN 'Removimos una publicación tuya'
      ELSE 'Advertencia de moderación' END;
    v_body := coalesce(v_msg, CASE p_action
      WHEN 'ban'            THEN 'Tu cuenta fue suspendida por incumplir las normas de la comunidad.'
      WHEN 'unban'          THEN 'Ya podés volver a publicar y postular en Conecta2.'
      WHEN 'remove_content' THEN '«' || coalesce(v_title, 'Tu publicación') || '» fue removida por incumplir las normas de la comunidad.'
      ELSE 'Recibiste una advertencia. Revisá las normas de la comunidad para evitar una suspensión.' END);
    -- Sin `url`: las apps ya publicadas navegan a ciegas a lo que venga ahí. Con
    -- un `screen` que no conocen solo abren la app.
    v_notified := public._moderation_notify(v_user, v_ntitle, v_body, jsonb_build_object(
      'screen', 'Moderation', 'kind', p_action, 'entity_type', p_entity_type,
      'entity_id', p_entity_id, 'entity_title', v_title, 'web_url', '/notificaciones'));
  END IF;

  INSERT INTO public.moderation_actions
    (admin_id, target_user_id, action, entity_type, entity_id, entity_title, report_id, message, notified)
  VALUES ((select auth.uid()), v_user, p_action, p_entity_type, p_entity_id, v_title, p_report_id, v_msg, v_notified)
  RETURNING id INTO v_action_id;

  RETURN jsonb_build_object('ok', true, 'action', p_action, 'action_id', v_action_id,
                            'target_user_id', v_user, 'notified', v_notified);
END $function$;

-- Cierra todos los reportes pendientes de un mismo contenido y avisa a quienes
-- reportaron. El texto es genérico a propósito: no revela la sanción.
CREATE OR REPLACE FUNCTION public._moderation_close_reports(
  p_entity_type text, p_entity_id uuid, p_status text, p_resolution text, p_notify boolean
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $function$
DECLARE v_rep uuid; v_n integer := 0; v_body text;
BEGIN
  v_body := CASE WHEN p_status = 'dismissed'
    THEN 'Revisamos tu reporte y no encontramos un incumplimiento de las normas. Gracias por avisarnos.'
    ELSE 'Revisamos tu reporte y tomamos medidas. Gracias por ayudar a cuidar la comunidad.' END;
  FOR v_rep IN
    WITH closed AS (
      UPDATE public.reports
         SET status = p_status, resolution = p_resolution,
             resolved_by = (select auth.uid()), resolved_at = now()
       WHERE entity_type = p_entity_type AND entity_id = p_entity_id AND status = 'pending'
      RETURNING reporter_id
    )
    SELECT DISTINCT reporter_id FROM closed
  LOOP
    v_n := v_n + 1;
    IF p_notify THEN
      PERFORM public._moderation_notify(v_rep, 'Revisamos tu reporte', v_body, jsonb_build_object(
        'screen', 'Moderation', 'kind', 'report_resolved', 'entity_type', p_entity_type,
        'entity_id', p_entity_id, 'web_url', '/notificaciones'));
    END IF;
  END LOOP;
  RETURN v_n;
END $function$;

-- ── 5. RPC del panel ────────────────────────────────────────────────────────
-- Resolver un reporte. Misma firma que antes (el panel publicado la llama así).
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id uuid, p_action text, p_notify boolean DEFAULT true, p_message text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $function$
DECLARE
  r public.reports%ROWTYPE; v_res text; v_status text; v_core jsonb; v_action text; v_closed integer;
  v_exists boolean;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('ok', false, 'code', 'forbidden'); END IF;
  SELECT * INTO r FROM public.reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'not_found'); END IF;
  IF r.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'code', 'already_resolved'); END IF;

  IF p_action = 'dismiss' THEN
    v_status := 'dismissed'; v_res := 'dismissed';
  ELSIF p_action = 'remove_content' THEN
    v_status := 'resolved'; v_res := 'content_removed'; v_action := 'remove_content';
  ELSIF p_action = 'ban_user' THEN
    v_status := 'resolved'; v_res := 'user_banned'; v_action := 'ban';
  ELSIF p_action = 'warn' THEN
    v_status := 'resolved'; v_res := 'warned'; v_action := 'warn';
  ELSE
    RETURN jsonb_build_object('ok', false, 'code', 'bad_action');
  END IF;

  IF v_action IS NOT NULL THEN
    v_exists := CASE r.entity_type
      WHEN 'user'   THEN EXISTS (SELECT 1 FROM public.users   WHERE id = r.entity_id)
      WHEN 'chamba' THEN EXISTS (SELECT 1 FROM public.chambas WHERE id = r.entity_id)
      WHEN 'job'    THEN EXISTS (SELECT 1 FROM public.jobs    WHERE id = r.entity_id)
      WHEN 'alert'  THEN EXISTS (SELECT 1 FROM public.alerts  WHERE id = r.entity_id)
      ELSE false END;

    IF v_exists THEN
      v_core := public._moderation_apply(v_action, r.entity_type, r.entity_id, p_message, p_notify, p_report_id);
    ELSIF v_action = 'remove_content' THEN
      -- El contenido ya no existe (su autor lo borró): no queda nada que remover.
      v_core := jsonb_build_object('ok', true);
    ELSIF r.reported_user_id IS NOT NULL THEN
      -- Ya no existe, pero la cuenta quedó registrada en el reporte.
      v_core := public._moderation_apply(v_action, 'user', r.reported_user_id, p_message, p_notify, p_report_id);
    ELSE
      RETURN jsonb_build_object('ok', false, 'code', 'no_owner');
    END IF;
    IF NOT coalesce((v_core->>'ok')::boolean, false) THEN
      RETURN v_core;
    END IF;
  END IF;

  v_closed := public._moderation_close_reports(r.entity_type, r.entity_id, v_status, v_res, p_notify);

  RETURN jsonb_build_object('ok', true, 'status', v_status, 'resolution', v_res, 'closed', v_closed);
END $function$;

-- Moderar sin que exista un reporte: desde las tablas de chambas, empleos y
-- usuarios del panel. Para suspender o reactivar una cuenta: entity_type 'user'.
CREATE OR REPLACE FUNCTION public.admin_moderate(
  p_action text, p_entity_type text, p_entity_id uuid,
  p_message text DEFAULT NULL, p_notify boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','auth'
AS $function$
DECLARE v_core jsonb; v_res text;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('ok', false, 'code', 'forbidden'); END IF;
  v_core := public._moderation_apply(p_action, p_entity_type, p_entity_id, p_message, p_notify, NULL);
  IF NOT coalesce((v_core->>'ok')::boolean, false) THEN
    RETURN v_core;
  END IF;
  -- Si había reportes abiertos sobre ese mismo contenido, quedan resueltos.
  IF p_action <> 'unban' THEN
    v_res := CASE p_action WHEN 'remove_content' THEN 'content_removed'
                           WHEN 'ban' THEN 'user_banned' ELSE 'warned' END;
    v_core := v_core || jsonb_build_object('closed',
      public._moderation_close_reports(p_entity_type, p_entity_id, 'resolved', v_res, p_notify));
  END IF;
  RETURN v_core;
END $function$;

-- Lista de reportes. Suma cuántos reportes abiertos tiene el mismo contenido y
-- cuántas sanciones previas tiene la cuenta, para decidir con contexto.
CREATE OR REPLACE FUNCTION public.admin_reports_list(
  p_status text DEFAULT 'pending', p_entity_type text DEFAULT NULL, p_limit int DEFAULT 20, p_offset int DEFAULT 0
) RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_total bigint; v_rows jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT count(*) INTO v_total FROM public.reports r
   WHERE r.entity_type IS NOT NULL
     AND (p_status IS NULL OR r.status = p_status)
     AND (p_entity_type IS NULL OR r.entity_type = p_entity_type);
  SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) INTO v_rows FROM (
    SELECT r.id, r.entity_type, r.entity_id, r.reason, r.description, r.status, r.resolution,
           r.created_at, r.resolved_at, r.reporter_id, r.reported_user_id,
           rep.full_name AS reporter_name, ru.full_name AS reported_user_name,
           coalesce(ru.is_banned, false) AS reported_user_banned,
           CASE r.entity_type WHEN 'user' THEN ru.full_name WHEN 'chamba' THEN c.title
                WHEN 'job' THEN j.title WHEN 'alert' THEN coalesce(a.company_name, a.description) END AS entity_title,
           CASE r.entity_type WHEN 'chamba' THEN c.status::text WHEN 'job' THEN j.status::text ELSE NULL END AS entity_status,
           (r.entity_type = 'user' AND ru.id IS NOT NULL) OR c.id IS NOT NULL OR j.id IS NOT NULL OR a.id IS NOT NULL AS entity_exists,
           (SELECT count(*) FROM public.reports r2
             WHERE r2.entity_type = r.entity_type AND r2.entity_id = r.entity_id AND r2.status = 'pending') AS same_entity_count,
           (SELECT count(*) FROM public.moderation_actions m
             WHERE m.target_user_id = r.reported_user_id AND m.action <> 'unban') AS user_prior_actions
    FROM public.reports r
    LEFT JOIN public.users   rep ON rep.id = r.reporter_id
    LEFT JOIN public.users   ru  ON ru.id  = r.reported_user_id
    LEFT JOIN public.chambas c   ON r.entity_type = 'chamba' AND c.id = r.entity_id
    LEFT JOIN public.jobs    j   ON r.entity_type = 'job'    AND j.id = r.entity_id
    LEFT JOIN public.alerts  a   ON r.entity_type = 'alert'  AND a.id = r.entity_id
    WHERE r.entity_type IS NOT NULL
      AND (p_status IS NULL OR r.status = p_status)
      AND (p_entity_type IS NULL OR r.entity_type = p_entity_type)
    ORDER BY r.created_at DESC
    LIMIT greatest(p_limit, 0) OFFSET greatest(p_offset, 0)
  ) x;
  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END $function$;

-- Historial de una cuenta: sanciones aplicadas y reportes recibidos.
CREATE OR REPLACE FUNCTION public.admin_user_moderation_history(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN jsonb_build_object(
    'is_banned', (SELECT coalesce(is_banned, false) FROM public.users WHERE id = p_user_id),
    'actions', (
      SELECT coalesce(jsonb_agg(row_to_json(x)), '[]'::jsonb) FROM (
        SELECT m.id, m.action, m.entity_type, m.entity_id, m.entity_title, m.message, m.notified,
               m.created_at, adm.full_name AS admin_name
        FROM public.moderation_actions m LEFT JOIN public.users adm ON adm.id = m.admin_id
        WHERE m.target_user_id = p_user_id
        ORDER BY m.created_at DESC LIMIT 50) x),
    'reports', (
      SELECT coalesce(jsonb_agg(row_to_json(y)), '[]'::jsonb) FROM (
        SELECT r.id, r.entity_type, r.entity_id, r.reason, r.description, r.status, r.resolution,
               r.created_at, rep.full_name AS reporter_name
        FROM public.reports r LEFT JOIN public.users rep ON rep.id = r.reporter_id
        WHERE r.reported_user_id = p_user_id
        ORDER BY r.created_at DESC LIMIT 50) y),
    'counts', jsonb_build_object(
      'warnings', (SELECT count(*) FROM public.moderation_actions WHERE target_user_id = p_user_id AND action = 'warn'),
      'removed',  (SELECT count(*) FROM public.moderation_actions WHERE target_user_id = p_user_id AND action = 'remove_content'),
      'bans',     (SELECT count(*) FROM public.moderation_actions WHERE target_user_id = p_user_id AND action = 'ban'),
      'reports',  (SELECT count(*) FROM public.reports WHERE reported_user_id = p_user_id))
  );
END $function$;

-- ── 6. Lo que ve el propio usuario ──────────────────────────────────────────
-- Para la pantalla de cuenta suspendida: si está suspendida, desde cuándo y el
-- motivo que escribió el equipo (si escribió alguno).
CREATE OR REPLACE FUNCTION public.my_account_status()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'banned', coalesce(u.is_banned, false),
    'reason', CASE WHEN u.is_banned THEN b.message END,
    'since',  CASE WHEN u.is_banned THEN b.created_at END)
  FROM public.users u
  LEFT JOIN LATERAL (
    SELECT m.message, m.created_at FROM public.moderation_actions m
     WHERE m.target_user_id = u.id AND m.action = 'ban'
     ORDER BY m.created_at DESC LIMIT 1) b ON true
  WHERE u.id = (select auth.uid());
$function$;

-- ── 7. El responsable de un reporte lo decide el servidor ───────────────────
-- Antes lo mandaba el cliente. Dos problemas: podía apuntar la sanción a
-- cualquiera, y para reportar una alerta anónima el cliente tenía que conocer a
-- su autor. Ahora se deriva del contenido reportado.
CREATE OR REPLACE FUNCTION public.reports_normalize()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_owner uuid;
BEGIN
  IF NEW.entity_type IS NULL AND NEW.reported_user_id IS NOT NULL THEN
    -- Clientes viejos que reportan un perfil sin mandar entity_type.
    NEW.entity_type := 'user';
    NEW.entity_id   := coalesce(NEW.entity_id, NEW.reported_user_id);
  END IF;
  IF NEW.entity_id IS NOT NULL THEN
    IF NEW.entity_type = 'user' THEN
      NEW.reported_user_id := NEW.entity_id;
    ELSIF NEW.entity_type = 'chamba' THEN
      SELECT employer_id INTO v_owner FROM public.chambas WHERE id = NEW.entity_id;
      NEW.reported_user_id := v_owner;
    ELSIF NEW.entity_type = 'job' THEN
      SELECT user_id INTO v_owner FROM public.jobs WHERE id = NEW.entity_id;
      NEW.reported_user_id := v_owner;
    ELSIF NEW.entity_type = 'alert' THEN
      SELECT user_id INTO v_owner FROM public.alerts WHERE id = NEW.entity_id;
      NEW.reported_user_id := v_owner;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- ── 8. WhatsApp desde el registro ───────────────────────────────────────────
-- El formulario de registro manda `whatsapp` en el metadata. Se guarda en
-- `user_private_data` (privada), nunca en `users`. Un valor inválido se ignora:
-- nada de esto puede romper un alta.
CREATE OR REPLACE FUNCTION public.handle_new_user_contact(p_user_id uuid, p_raw text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_wa text := regexp_replace(coalesce(p_raw, ''), '\D', '', 'g');
BEGIN
  IF length(v_wa) = 8 THEN v_wa := '591' || v_wa; END IF;
  IF v_wa !~ '^591[67][0-9]{7}$' THEN RETURN; END IF;
  BEGIN
    INSERT INTO public.user_private_data (user_id, whatsapp)
    VALUES (p_user_id, v_wa)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_full_name text := coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), new.email);
  v_type user_type_enum := case
    when new.raw_user_meta_data->>'user_type' = 'employer' then 'employer'::user_type_enum
    else 'worker'::user_type_enum
  end;
  -- Ciudad elegida en el registro. Si no vino ninguna, se mantiene el default
  -- histórico para no dejar el perfil sin ciudad.
  v_city text := coalesce(nullif(trim(new.raw_user_meta_data->>'city'), ''), 'Cochabamba');
  -- Edad: se acepta solo si es un número dentro del rango que valida el
  -- formulario. Un metadata basura no debe romper el registro.
  v_age smallint := nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'age',''), '\D', '', 'g'), '')::smallint;
  v_base text := public.username_slugify(
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1))
  );
  v_username text;
  v_attempt int := 0;
begin
  if v_age is not null and (v_age < 14 or v_age > 100) then
    v_age := null;
  end if;

  loop
    begin
      if v_attempt = 0 then
        v_username := public.username_make_unique(v_base);
      else
        v_username := public.username_make_unique(v_base || floor(random() * 100000)::int::text);
      end if;

      insert into public.users (
        id, email, full_name, username, user_type, city, age, rating, jobs_completed, wallet_balance
      )
      values (
        new.id, new.email, v_full_name, v_username, v_type, v_city, v_age, 0, 0, 0
      )
      on conflict (id) do nothing;

      perform public.handle_new_user_contact(new.id, new.raw_user_meta_data->>'whatsapp');
      return new;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt >= 5 then
        -- último recurso: NO romper el registro.
        insert into public.users (
          id, email, full_name, user_type, city, age, rating, jobs_completed, wallet_balance
        )
        values (
          new.id, new.email, v_full_name, v_type, v_city, v_age, 0, 0, 0
        )
        on conflict (id) do nothing;
        perform public.handle_new_user_contact(new.id, new.raw_user_meta_data->>'whatsapp');
        return new;
      end if;
    end;
  end loop;
end;
$function$;

-- ── 9. Permisos ─────────────────────────────────────────────────────────────
DO $$ DECLARE fn text; BEGIN
  -- Internas: nadie las llama desde afuera.
  FOREACH fn IN ARRAY ARRAY[
    'public._moderation_notify(uuid,text,text,jsonb)',
    'public._moderation_apply(text,text,uuid,text,boolean,uuid)',
    'public._moderation_close_reports(text,uuid,text,text,boolean)',
    'public.handle_new_user_contact(uuid,text)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
  -- Del panel y del propio usuario: solo con sesión (cada una valida is_admin).
  FOREACH fn IN ARRAY ARRAY[
    'public.admin_resolve_report(uuid,text,boolean,text)',
    'public.admin_reports_list(text,text,int,int)',
    'public.admin_moderate(text,text,uuid,text,boolean)',
    'public.admin_user_moderation_history(uuid)',
    'public.my_account_status()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
