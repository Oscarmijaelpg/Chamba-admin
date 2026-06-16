-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs de "Insights" para el Admin — geografía, intensidad de uso, búsqueda,
-- oferta de empleos y listado de usuarios filtrable/ordenable.
-- Proyecto Supabase: eavefhyizomclwmnaxcp
--
-- Mismas convenciones que admin_analytics_rpcs.sql:
--   SECURITY DEFINER + guard public.is_admin() + STABLE + search_path public.
--   Agregan en Postgres y devuelven JSON listo para el chart/tabla.
-- ─────────────────────────────────────────────────────────────────────────────

-- A) Geografía: usuarios por ciudad (+ % y edad promedio) y empleos activos por ciudad.
CREATE OR REPLACE FUNCTION public.admin_geo_analytics()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE res jsonb; v_total bigint;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  v_total := (SELECT count(*) FROM users WHERE deleted_at IS NULL);
  SELECT jsonb_build_object(
    'totalUsers', v_total,
    'byCity', coalesce((
      SELECT jsonb_agg(x ORDER BY (x->>'users')::int DESC) FROM (
        SELECT jsonb_build_object(
          'city',   coalesce(nullif(city,''),'Sin ciudad'),
          'users',  count(*),
          'pct',    CASE WHEN v_total > 0 THEN round(count(*)::numeric / v_total * 100, 1) ELSE 0 END,
          'avgAge', round(avg(age))
        ) AS x
        FROM users WHERE deleted_at IS NULL
        GROUP BY coalesce(nullif(city,''),'Sin ciudad')
      ) s
    ), '[]'::jsonb),
    'jobsByCity', coalesce((
      SELECT jsonb_agg(x ORDER BY (x->>'jobs')::int DESC) FROM (
        SELECT jsonb_build_object('city', coalesce(nullif(city,''),'Sin ciudad'), 'jobs', count(*)) AS x
        FROM jobs WHERE status = 'open'
        GROUP BY coalesce(nullif(city,''),'Sin ciudad')
      ) s
    ), '[]'::jsonb)
  ) INTO res;
  RETURN res;
END $$;

-- B) Intensidad de uso (últimos 30 días): cuánto consume cada usuario activo.
CREATE OR REPLACE FUNCTION public.admin_usage_intensity()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE res jsonb; v_views bigint; v_searches bigint; v_mau bigint; v_userdays bigint;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT count(*) INTO v_views    FROM analytics_events WHERE event_name = 'view_job'         AND timestamp >= now() - interval '30 days';
  SELECT count(*) INTO v_searches FROM analytics_events WHERE event_name = 'search_performed' AND timestamp >= now() - interval '30 days';
  SELECT count(DISTINCT user_id) INTO v_mau FROM analytics_events WHERE timestamp >= now() - interval '30 days' AND user_id IS NOT NULL;
  -- "usuario-días activos": suma de DAU de cada día (denominador de vistas/usuario/día).
  SELECT coalesce(sum(d), 0) INTO v_userdays FROM (
    SELECT count(DISTINCT user_id) AS d
    FROM analytics_events
    WHERE timestamp >= now() - interval '30 days' AND user_id IS NOT NULL
    GROUP BY timestamp::date
  ) t;
  res := jsonb_build_object(
    'views30', v_views,
    'searches30', v_searches,
    'mau', v_mau,
    'viewsPerActiveUser',       CASE WHEN v_mau > 0 THEN round(v_views::numeric / v_mau, 1) ELSE 0 END,
    'searchesPerActiveUser',    CASE WHEN v_mau > 0 THEN round(v_searches::numeric / v_mau, 1) ELSE 0 END,
    'viewsPerActiveUserPerDay', CASE WHEN v_userdays > 0 THEN round(v_views::numeric / v_userdays, 1) ELSE 0 END
  );
  RETURN res;
END $$;

-- C) Búsqueda e intención (search_performed): volumen, pestaña, longitud y serie diaria.
CREATE OR REPLACE FUNCTION public.admin_search_insights(p_days int DEFAULT 30)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  WITH ev AS (
    SELECT timestamp, properties FROM analytics_events
    WHERE event_name = 'search_performed' AND timestamp >= now() - (p_days || ' days')::interval
  ),
  days AS (
    SELECT generate_series((now() - ((p_days - 1) || ' days')::interval)::date, now()::date, interval '1 day')::date AS day
  ),
  perday AS (
    SELECT days.day, count(ev.*) AS n
    FROM days LEFT JOIN ev ON ev.timestamp::date = days.day
    GROUP BY days.day
  )
  SELECT jsonb_build_object(
    'total',  (SELECT count(*) FROM ev),
    'views',  (SELECT count(*) FROM analytics_events WHERE event_name = 'view_job' AND timestamp >= now() - (p_days || ' days')::interval),
    'avgLen', (SELECT round(avg((properties->>'query_length')::numeric), 1) FROM ev WHERE properties ? 'query_length'),
    'byTab',  coalesce((
      SELECT jsonb_agg(jsonb_build_object('tab', tab, 'n', n) ORDER BY n DESC)
      FROM (SELECT coalesce(nullif(properties->>'tab',''),'(sin)') AS tab, count(*) AS n FROM ev GROUP BY 1) t
    ), '[]'::jsonb),
    'perDay', (SELECT jsonb_agg(jsonb_build_object('d', to_char(day,'YYYY-MM-DD'), 'n', n) ORDER BY day) FROM perday)
  ) INTO res;
  RETURN res;
END $$;

-- D) Oferta de empleos: por fuente, por categoría y oferta (nuevos) vs demanda (vistas) por día.
CREATE OR REPLACE FUNCTION public.admin_supply_analytics(p_days int DEFAULT 30)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  WITH days AS (
    SELECT generate_series((now() - ((p_days - 1) || ' days')::interval)::date, now()::date, interval '1 day')::date AS day
  ),
  newjobs AS (
    SELECT created_at::date AS d, count(*) AS n FROM jobs
    WHERE created_at >= now() - (p_days || ' days')::interval GROUP BY 1
  ),
  vws AS (
    SELECT timestamp::date AS d, count(*) AS n FROM analytics_events
    WHERE event_name = 'view_job' AND timestamp >= now() - (p_days || ' days')::interval GROUP BY 1
  )
  SELECT jsonb_build_object(
    'bySource', coalesce((
      SELECT jsonb_agg(jsonb_build_object('source', source, 'jobs', n) ORDER BY n DESC)
      FROM (SELECT coalesce(nullif(source,''),'(sin fuente)') AS source, count(*) AS n FROM jobs WHERE status = 'open' GROUP BY 1) s
    ), '[]'::jsonb),
    'byCategory', coalesce((
      SELECT jsonb_agg(jsonb_build_object('label', label, 'jobs', n) ORDER BY n DESC)
      FROM (
        SELECT coalesce(jc.label, cat) AS label, count(*) AS n
        FROM jobs j, unnest(j.category) AS cat
        LEFT JOIN job_categories jc ON jc.id = cat
        WHERE j.status = 'open'
        GROUP BY coalesce(jc.label, cat)
      ) c
    ), '[]'::jsonb),
    'supplyDemand', (
      SELECT jsonb_agg(jsonb_build_object(
        'd', to_char(days.day,'YYYY-MM-DD'),
        'nuevos', coalesce(nj.n, 0),
        'vistas', coalesce(v.n, 0)
      ) ORDER BY days.day)
      FROM days
      LEFT JOIN newjobs nj ON nj.d = days.day
      LEFT JOIN vws v ON v.d = days.day
    )
  ) INTO res;
  RETURN res;
END $$;

-- E) Lista de ciudades (para el dropdown de filtro en Usuarios), ordenadas por nº de usuarios.
CREATE OR REPLACE FUNCTION public.admin_user_cities()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT coalesce(jsonb_agg(city ORDER BY n DESC), '[]'::jsonb) INTO res
  FROM (
    SELECT city, count(*) AS n FROM users
    WHERE deleted_at IS NULL AND city IS NOT NULL AND city <> ''
    GROUP BY city
  ) s;
  RETURN res;
END $$;

-- F) Listado de usuarios paginado con filtros (ciudad, edad), búsqueda y orden
--    (registro, última conexión, edad, nombre). Incluye `last_seen` por usuario
--    (max(timestamp) en analytics_events) para mostrar/ordenar por última conexión
--    y `preferences` (etiquetas de categorías que el usuario guardó como preferencia).
--
--    Filtro de edad: p_age_min/p_age_max permiten edad exacta (min=max) o rango
--    abierto (incl. menores de 18). Cuando vienen, tienen prioridad sobre p_age_band.
DROP FUNCTION IF EXISTS public.admin_users_list(text,text,text,text,text,int,int);
CREATE OR REPLACE FUNCTION public.admin_users_list(
  p_search   text DEFAULT NULL,
  p_city     text DEFAULT NULL,
  p_age_band text DEFAULT 'all',
  p_sort     text DEFAULT 'created_at',
  p_dir      text DEFAULT 'desc',
  p_limit    int  DEFAULT 20,
  p_offset   int  DEFAULT 0,
  p_age_min  int  DEFAULT NULL,
  p_age_max  int  DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_sort text; v_dir text; v_use_range boolean;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;

  -- Whitelist de orden y dirección (no se interpola texto crudo en el ORDER BY).
  v_sort := CASE p_sort WHEN 'last_seen' THEN 'last_seen' WHEN 'age' THEN 'age' WHEN 'full_name' THEN 'full_name' ELSE 'created_at' END;
  v_dir  := CASE lower(coalesce(p_dir,'desc')) WHEN 'asc' THEN 'asc' ELSE 'desc' END;
  v_use_range := (p_age_min IS NOT NULL OR p_age_max IS NOT NULL);

  RETURN (
    WITH base AS (
      SELECT u.*, ls.last_seen, pr.preferences, pr.pref_notify
      FROM users u
      LEFT JOIN LATERAL (
        SELECT max(e.timestamp) AS last_seen FROM analytics_events e WHERE e.user_id = u.id
      ) ls ON true
      LEFT JOIN LATERAL (
        SELECT p.notify AS pref_notify,
          coalesce((
            SELECT jsonb_agg(coalesce(jc.label, c.cat) ORDER BY jc.sort_order NULLS LAST, c.cat)
            FROM unnest(p.categories) AS c(cat)
            LEFT JOIN job_categories jc ON jc.id = c.cat
          ), '[]'::jsonb) AS preferences
        FROM user_job_preferences p
        WHERE p.user_id = u.id
        LIMIT 1
      ) pr ON true
      WHERE u.deleted_at IS NULL
        AND (p_search IS NULL OR p_search = '' OR u.full_name ILIKE '%'||p_search||'%' OR u.email ILIKE '%'||p_search||'%')
        AND (p_city IS NULL OR p_city = '' OR u.city = p_city)
        -- Rango exacto/abierto por edad (prioritario si viene min o max).
        AND (
          NOT v_use_range
          OR (u.age IS NOT NULL
              AND (p_age_min IS NULL OR u.age >= p_age_min)
              AND (p_age_max IS NULL OR u.age <= p_age_max))
        )
        -- Bandas predefinidas (sólo si no se usa rango explícito).
        AND (
          v_use_range
          OR coalesce(p_age_band,'all') = 'all'
          OR (p_age_band = 'none'    AND u.age IS NULL)
          OR (p_age_band = 'under18' AND u.age < 18)
          OR (p_age_band = '18-24'   AND u.age BETWEEN 18 AND 24)
          OR (p_age_band = '25-34'   AND u.age BETWEEN 25 AND 34)
          OR (p_age_band = '35-44'   AND u.age BETWEEN 35 AND 44)
          OR (p_age_band = '45-54'   AND u.age BETWEEN 45 AND 54)
          OR (p_age_band = '55+'     AND u.age >= 55)
        )
    ),
    counted AS (SELECT count(*) AS c FROM base),
    ordered AS (
      SELECT to_jsonb(b) AS row, row_number() OVER (ORDER BY
        CASE WHEN v_sort='last_seen'  AND v_dir='desc' THEN b.last_seen  END DESC NULLS LAST,
        CASE WHEN v_sort='last_seen'  AND v_dir='asc'  THEN b.last_seen  END ASC  NULLS LAST,
        CASE WHEN v_sort='created_at' AND v_dir='desc' THEN b.created_at END DESC NULLS LAST,
        CASE WHEN v_sort='created_at' AND v_dir='asc'  THEN b.created_at END ASC  NULLS LAST,
        CASE WHEN v_sort='age'        AND v_dir='desc' THEN b.age        END DESC NULLS LAST,
        CASE WHEN v_sort='age'        AND v_dir='asc'  THEN b.age        END ASC  NULLS LAST,
        CASE WHEN v_sort='full_name'  AND v_dir='asc'  THEN b.full_name  END ASC  NULLS LAST,
        CASE WHEN v_sort='full_name'  AND v_dir='desc' THEN b.full_name  END DESC NULLS LAST
      ) AS rn
      FROM base b
    ),
    page AS (
      SELECT row, rn FROM ordered ORDER BY rn LIMIT p_limit OFFSET p_offset
    )
    SELECT jsonb_build_object(
      'total', (SELECT c FROM counted),
      'rows',  coalesce((SELECT jsonb_agg(row ORDER BY rn) FROM page), '[]'::jsonb)
    )
  );
END $$;

-- G) Preferencias de categorías: qué tipo de empleos guarda más la gente como
--    preferencia (onboarding / alertas). Agrega user_job_preferences.categories,
--    resuelve la etiqueta legible y calcula % sobre los usuarios con preferencias.
CREATE OR REPLACE FUNCTION public.admin_preference_analytics()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE res jsonb; v_total bigint; v_notify bigint;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  -- Usuarios que guardaron al menos una categoría como preferencia.
  SELECT count(*) INTO v_total  FROM user_job_preferences WHERE coalesce(array_length(categories, 1), 0) > 0;
  SELECT count(*) INTO v_notify FROM user_job_preferences WHERE notify = true AND coalesce(array_length(categories, 1), 0) > 0;
  SELECT jsonb_build_object(
    'totalUsers',  v_total,
    'notifyUsers', v_notify,
    'byCategory', coalesce((
      SELECT jsonb_agg(jsonb_build_object('label', label, 'users', n, 'pct', pct) ORDER BY n DESC)
      FROM (
        SELECT coalesce(jc.label, cat) AS label,
               count(DISTINCT p.user_id) AS n,
               CASE WHEN v_total > 0 THEN round(count(DISTINCT p.user_id)::numeric / v_total * 100, 1) ELSE 0 END AS pct
        FROM user_job_preferences p, unnest(p.categories) AS cat
        LEFT JOIN job_categories jc ON jc.id = cat
        GROUP BY coalesce(jc.label, cat)
      ) s
    ), '[]'::jsonb)
  ) INTO res;
  RETURN res;
END $$;

-- Permisos: ejecutables por usuarios autenticados (el guard interno exige admin).
GRANT EXECUTE ON FUNCTION public.admin_geo_analytics()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_usage_intensity()        TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_search_insights(int)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_supply_analytics(int)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_preference_analytics()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_cities()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_users_list(text,text,text,text,text,int,int,int,int) TO authenticated;
