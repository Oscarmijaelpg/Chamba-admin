-- ============================================================================
-- Reportes unificados: `reports` polimórfica (user|chamba|job|alert) + RPCs de
-- moderación. Idempotente. Aplicado vía Management API (proyecto eavefhyizomclwmnaxcp).
-- Valores confirmados por introspección:
--   remove_content: chamba -> status='deleted'; job -> status='rejected'; alert -> DELETE.
--   notify_user(p_user_id uuid, p_type text, p_title text, p_body text, p_data jsonb).
--   notifications.type es text libre (sin CHECK) -> 'moderation' es válido.
-- ============================================================================

-- 1) Columnas nuevas (aditivas, nullable)
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS entity_id   uuid;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolution  text;

-- 2) Normalizar status legacy antes de tocar el CHECK (no-op si no hay filas)
UPDATE public.reports SET status='resolved'  WHERE status='reviewed';
UPDATE public.reports SET status='dismissed' WHERE status='rejected';

-- 3) CHECKs (entity_type permite NULL para retrocompat con OTA viejos)
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports ADD  CONSTRAINT reports_status_check
  CHECK (status IN ('pending','resolved','dismissed'));
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_entity_type_check;
ALTER TABLE public.reports ADD  CONSTRAINT reports_entity_type_check
  CHECK (entity_type IS NULL OR entity_type IN ('user','chamba','job','alert'));

-- 4) Backfill de filas legacy (perfil). Dedupe: la más reciente por (reporter,reported)
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY reporter_id, reported_user_id ORDER BY created_at DESC) rn
  FROM public.reports WHERE entity_type IS NULL AND reported_user_id IS NOT NULL
)
UPDATE public.reports r SET entity_type='user', entity_id=r.reported_user_id
FROM ranked WHERE r.id=ranked.id AND ranked.rn=1;

-- 5) Índices
CREATE UNIQUE INDEX IF NOT EXISTS reports_reporter_entity_uidx
  ON public.reports (reporter_id, entity_type, entity_id)
  WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reports_entity_idx ON public.reports (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS reports_status_created_idx ON public.reports (status, created_at DESC);

-- 6) Migrar chamba_reports (0 filas hoy; idempotente a futuro)
INSERT INTO public.reports (reporter_id, reported_user_id, entity_type, entity_id, reason, description, status, created_at)
SELECT DISTINCT ON (cr.reporter_id, cr.chamba_id)
  cr.reporter_id, c.employer_id, 'chamba', cr.chamba_id,
  COALESCE(cr.reason::text,'(sin motivo)'), NULL,
  CASE WHEN cr.status::text IN ('resolved','dismissed') THEN cr.status::text ELSE 'pending' END,
  cr.created_at
FROM public.chamba_reports cr LEFT JOIN public.chambas c ON c.id=cr.chamba_id
ORDER BY cr.reporter_id, cr.chamba_id, cr.created_at DESC
ON CONFLICT DO NOTHING;

-- 7) Migrar alert_reports
INSERT INTO public.reports (reporter_id, reported_user_id, entity_type, entity_id, reason, description, status, created_at)
SELECT ar.reporter_id, a.user_id, 'alert', ar.alert_id,
       COALESCE(ar.reason::text,'(sin motivo)'), ar.description, 'pending', ar.created_at
FROM public.alert_reports ar LEFT JOIN public.alerts a ON a.id=ar.alert_id
ON CONFLICT DO NOTHING;

-- 8) Trigger de normalización (clientes OTA viejos que insertan sin entity_type)
CREATE OR REPLACE FUNCTION public.reports_normalize() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.entity_type IS NULL AND NEW.reported_user_id IS NOT NULL THEN
    NEW.entity_type := 'user';
    NEW.entity_id   := COALESCE(NEW.entity_id, NEW.reported_user_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_reports_normalize ON public.reports;
CREATE TRIGGER trg_reports_normalize BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.reports_normalize();

-- 9) Forwarding de alert_reports -> reports (OTA viejos que reportan alertas)
CREATE OR REPLACE FUNCTION public.forward_alert_report() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.reports (reporter_id, reported_user_id, entity_type, entity_id, reason, description, status, created_at)
  SELECT NEW.reporter_id, a.user_id, 'alert', NEW.alert_id,
         COALESCE(NEW.reason::text,'(sin motivo)'), NEW.description, 'pending', COALESCE(NEW.created_at, now())
  FROM public.alerts a WHERE a.id=NEW.alert_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_forward_alert_report ON public.alert_reports;
CREATE TRIGGER trg_forward_alert_report AFTER INSERT ON public.alert_reports
  FOR EACH ROW EXECUTE FUNCTION public.forward_alert_report();

-- 10) RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reports_insert_own ON public.reports;
CREATE POLICY reports_insert_own ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = (select auth.uid()));
DROP POLICY IF EXISTS reports_select_own_or_admin ON public.reports;
CREATE POLICY reports_select_own_or_admin ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = (select auth.uid()) OR (select public.is_admin()));
DROP POLICY IF EXISTS reports_update_admin ON public.reports;
CREATE POLICY reports_update_admin ON public.reports FOR UPDATE TO authenticated
  USING ((select public.is_admin())) WITH CHECK ((select public.is_admin()));

-- 11) RPC de acción de moderación
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id uuid, p_action text, p_notify boolean DEFAULT true, p_message text DEFAULT null
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth' AS $$
DECLARE r public.reports%ROWTYPE; v_res text; v_status text; v_body text;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('ok',false,'code','forbidden'); END IF;
  SELECT * INTO r FROM public.reports WHERE id=p_report_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'code','not_found'); END IF;
  IF r.status <> 'pending' THEN RETURN jsonb_build_object('ok',false,'code','already_resolved'); END IF;

  IF p_action='dismiss' THEN
    v_status:='dismissed'; v_res:='dismissed';
  ELSIF p_action='remove_content' THEN
    v_status:='resolved'; v_res:='content_removed';
    IF r.entity_id IS NOT NULL THEN
      IF    r.entity_type='chamba' THEN UPDATE public.chambas SET status='deleted'  WHERE id=r.entity_id;
      ELSIF r.entity_type='job'    THEN UPDATE public.jobs    SET status='rejected' WHERE id=r.entity_id;
      ELSIF r.entity_type='alert'  THEN DELETE FROM public.alerts WHERE id=r.entity_id;
      END IF;
    END IF;
  ELSIF p_action='ban_user' THEN
    v_status:='resolved'; v_res:='user_banned';
    IF r.reported_user_id IS NOT NULL THEN UPDATE public.users SET is_banned=true WHERE id=r.reported_user_id; END IF;
  ELSIF p_action='warn' THEN
    v_status:='resolved'; v_res:='warned';
  ELSE
    RETURN jsonb_build_object('ok',false,'code','bad_action');
  END IF;

  UPDATE public.reports SET status=v_status, resolution=v_res, resolved_by=auth.uid(), resolved_at=now()
   WHERE id=p_report_id;

  IF p_notify AND r.reported_user_id IS NOT NULL AND p_action <> 'dismiss' THEN
    BEGIN
      v_body := COALESCE(NULLIF(p_message,''), CASE v_res
        WHEN 'user_banned'     THEN 'Tu cuenta fue suspendida por incumplir las normas de la comunidad.'
        WHEN 'content_removed' THEN 'Una publicación tuya fue removida por incumplir las normas de la comunidad.'
        ELSE 'Recibiste una advertencia de moderación. Revisá las normas de la comunidad.' END);
      PERFORM public.notify_user(r.reported_user_id, 'moderation', 'Moderación de Conecta2', v_body,
        jsonb_build_object('report_id', p_report_id, 'resolution', v_res));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN jsonb_build_object('ok',true,'status',v_status,'resolution',v_res);
END $$;

-- 12) RPC de lectura para el admin (joins polimórficos + total, gateado por is_admin)
CREATE OR REPLACE FUNCTION public.admin_reports_list(
  p_status text DEFAULT 'pending', p_entity_type text DEFAULT null, p_limit int DEFAULT 20, p_offset int DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_total bigint; v_rows jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT count(*) INTO v_total FROM public.reports r
   WHERE r.entity_type IS NOT NULL
     AND (p_status IS NULL OR r.status=p_status)
     AND (p_entity_type IS NULL OR r.entity_type=p_entity_type);
  SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]'::jsonb) INTO v_rows FROM (
    SELECT r.id, r.entity_type, r.entity_id, r.reason, r.description, r.status, r.resolution,
           r.created_at, r.resolved_at, r.reporter_id, r.reported_user_id,
           rep.full_name AS reporter_name, ru.full_name AS reported_user_name,
           COALESCE(ru.is_banned,false) AS reported_user_banned,
           CASE r.entity_type WHEN 'user' THEN ru.full_name WHEN 'chamba' THEN c.title
                WHEN 'job' THEN j.title WHEN 'alert' THEN COALESCE(a.company_name, a.description) END AS entity_title,
           CASE r.entity_type WHEN 'chamba' THEN c.status::text WHEN 'job' THEN j.status::text ELSE NULL END AS entity_status
    FROM public.reports r
    LEFT JOIN public.users   rep ON rep.id=r.reporter_id
    LEFT JOIN public.users   ru  ON ru.id =r.reported_user_id
    LEFT JOIN public.chambas c   ON r.entity_type='chamba' AND c.id=r.entity_id
    LEFT JOIN public.jobs    j   ON r.entity_type='job'    AND j.id=r.entity_id
    LEFT JOIN public.alerts  a   ON r.entity_type='alert'  AND a.id=r.entity_id
    WHERE r.entity_type IS NOT NULL
      AND (p_status IS NULL OR r.status=p_status)
      AND (p_entity_type IS NULL OR r.entity_type=p_entity_type)
    ORDER BY r.created_at DESC
    LIMIT GREATEST(p_limit,0) OFFSET GREATEST(p_offset,0)
  ) x;
  RETURN jsonb_build_object('rows',v_rows,'total',v_total);
END $$;

-- 13) Grants
DO $$ DECLARE fn text; BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.admin_resolve_report(uuid,text,boolean,text)',
    'public.admin_reports_list(text,text,int,int)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    BEGIN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn); EXCEPTION WHEN OTHERS THEN NULL; END;
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
