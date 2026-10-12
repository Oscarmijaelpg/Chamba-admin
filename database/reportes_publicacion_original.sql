-- Reportes del panel: la tarjeta muestra la publicación original, quién la
-- publicó y qué se resolvió, sin tener que abrir nada.
-- Solo agrega campos a la respuesta de admin_reports_list (misma firma).
CREATE OR REPLACE FUNCTION public.admin_reports_list(p_status text DEFAULT 'pending'::text, p_entity_type text DEFAULT NULL::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS jsonb
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
           -- La publicación original, recortada, para leerla en la tarjeta.
           left(CASE r.entity_type WHEN 'chamba' THEN c.description WHEN 'job' THEN j.description
                WHEN 'alert' THEN a.description END, 600) AS entity_description,
           CASE r.entity_type WHEN 'chamba' THEN c.city WHEN 'job' THEN j.city WHEN 'alert' THEN a.city END AS entity_city,
           CASE r.entity_type WHEN 'chamba' THEN c.created_at WHEN 'job' THEN j.created_at
                WHEN 'alert' THEN a.created_at END AS entity_created_at,
           coalesce(a.anonymous, false) AS entity_anonymous,
           res.full_name AS resolved_by_name,
           act.action AS action_taken, act.message AS action_message, act.notified AS action_notified,
           (SELECT count(*) FROM public.reports r2
             WHERE r2.entity_type = r.entity_type AND r2.entity_id = r.entity_id AND r2.status = 'pending') AS same_entity_count,
           (SELECT count(*) FROM public.moderation_actions m
             WHERE m.target_user_id = r.reported_user_id AND m.action <> 'unban') AS user_prior_actions
    FROM public.reports r
    LEFT JOIN public.users   rep ON rep.id = r.reporter_id
    LEFT JOIN public.users   ru  ON ru.id  = r.reported_user_id
    LEFT JOIN public.users   res ON res.id = r.resolved_by
    LEFT JOIN public.chambas c   ON r.entity_type = 'chamba' AND c.id = r.entity_id
    LEFT JOIN public.jobs    j   ON r.entity_type = 'job'    AND j.id = r.entity_id
    LEFT JOIN public.alerts  a   ON r.entity_type = 'alert'  AND a.id = r.entity_id
    -- La sanción que cerró el reporte: la suya o, si se cerró junto con otros
    -- del mismo contenido, la que se aplicó sobre ese contenido.
    LEFT JOIN LATERAL (
      SELECT m.action, m.message, m.notified FROM public.moderation_actions m
       WHERE r.status = 'resolved' AND m.action <> 'unban'
         AND (m.report_id = r.id OR (m.entity_type = r.entity_type AND m.entity_id = r.entity_id))
       ORDER BY (m.report_id = r.id) DESC NULLS LAST, m.created_at DESC LIMIT 1
    ) act ON true
    WHERE r.entity_type IS NOT NULL
      AND (p_status IS NULL OR r.status = p_status)
      AND (p_entity_type IS NULL OR r.entity_type = p_entity_type)
    ORDER BY r.created_at DESC
    LIMIT greatest(p_limit, 0) OFFSET greatest(p_offset, 0)
  ) x;
  RETURN jsonb_build_object('rows', v_rows, 'total', v_total);
END $function$;
