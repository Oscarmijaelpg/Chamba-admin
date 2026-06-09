-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs de analytics para el Admin — agregación en Postgres
-- Proyecto Supabase: eavefhyizomclwmnaxcp
--
-- Motivación: las vistas de Analytics bajaban miles de filas crudas al navegador
-- (analytics_events, applications, users…) y agregaban en JS. Con PostgREST
-- max_rows=5000 eso además truncaba resultados. Estas funciones agregan del lado
-- del servidor y devuelven ~unas pocas filas en JSON, ya listas para el chart.
--
-- Todas son SECURITY DEFINER + guard public.is_admin() (igual que admin_delete_user)
-- y STABLE (solo leen). Aplicadas en producción vía Management API; versionadas aquí.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Recurrencia (DAU/WAU/MAU + stickiness) y serie diaria de activos (30d).
CREATE OR REPLACE FUNCTION public.admin_engagement_metrics()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  WITH ev AS (
    SELECT user_id, created_at FROM analytics_events
    WHERE created_at >= now() - interval '30 days' AND user_id IS NOT NULL
  ),
  w AS (
    SELECT
      count(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '1 day')  AS dau,
      count(DISTINCT user_id) FILTER (WHERE created_at >= now() - interval '7 days')  AS wau,
      count(DISTINCT user_id)                                                          AS mau
    FROM ev
  ),
  d AS (
    SELECT generate_series((now() - interval '29 days')::date, now()::date, interval '1 day')::date AS day
  ),
  pd AS (
    SELECT d.day, count(DISTINCT ev.user_id) AS activos
    FROM d LEFT JOIN ev ON ev.created_at::date = d.day
    GROUP BY d.day
  )
  SELECT jsonb_build_object(
    'dau', w.dau, 'wau', w.wau, 'mau', w.mau,
    'stickiness', CASE WHEN w.mau > 0 THEN round(w.dau::numeric / w.mau * 100) ELSE 0 END,
    'trend', (SELECT jsonb_agg(jsonb_build_object('d', to_char(day, 'YYYY-MM-DD'), 'activos', activos) ORDER BY day) FROM pd)
  ) INTO res FROM w;
  RETURN res;
END $$;

-- 2) Embudo de activación (usuarios únicos por etapa).
CREATE OR REPLACE FUNCTION public.admin_funnel()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT jsonb_build_object(
    'total',   (SELECT count(*) FROM users),
    'active',  (SELECT count(DISTINCT user_id) FROM analytics_events WHERE created_at >= now() - interval '30 days' AND user_id IS NOT NULL),
    'applied', (SELECT count(DISTINCT worker_id) FROM applications WHERE worker_id IS NOT NULL),
    'paid',    (SELECT count(DISTINCT worker_id) FROM payments WHERE status = 'released' AND worker_id IS NOT NULL)
  ) INTO res;
  RETURN res;
END $$;

-- 3) Postulaciones por día.
CREATE OR REPLACE FUNCTION public.admin_applications_trend(p_days int DEFAULT 30)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  WITH d AS (
    SELECT generate_series((now() - (p_days - 1) * interval '1 day')::date, now()::date, interval '1 day')::date AS day
  ),
  a AS (
    SELECT created_at::date AS day, count(*) AS c FROM applications
    WHERE created_at >= (now() - (p_days - 1) * interval '1 day')::date
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'total',  (SELECT coalesce(sum(c), 0) FROM a),
    'series', (SELECT jsonb_agg(jsonb_build_object('d', to_char(d.day, 'YYYY-MM-DD'), 'postulaciones', coalesce(a.c, 0)) ORDER BY d.day)
               FROM d LEFT JOIN a ON a.day = d.day)
  ) INTO res;
  RETURN res;
END $$;

-- 4) Crecimiento de usuarios por día (nuevos; el acumulado se calcula en el cliente).
CREATE OR REPLACE FUNCTION public.admin_user_growth(p_days int DEFAULT 30)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  WITH d AS (
    SELECT generate_series((now() - (p_days - 1) * interval '1 day')::date, now()::date, interval '1 day')::date AS day
  ),
  u AS (
    SELECT created_at::date AS day, count(*) AS c FROM users
    WHERE created_at >= (now() - (p_days - 1) * interval '1 day')::date
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'total',  (SELECT coalesce(sum(c), 0) FROM u),
    'series', (SELECT jsonb_agg(jsonb_build_object('d', to_char(d.day, 'YYYY-MM-DD'), 'nuevos', coalesce(u.c, 0)) ORDER BY d.day)
               FROM d LEFT JOIN u ON u.day = d.day)
  ) INTO res;
  RETURN res;
END $$;

-- 5) Distribución etaria de usuarios.
CREATE OR REPLACE FUNCTION public.admin_age_analytics()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE res jsonb; v_total int; v_with int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT count(*) INTO v_total FROM users;
  SELECT count(*) INTO v_with  FROM users WHERE age IS NOT NULL AND age > 0;
  SELECT jsonb_build_object(
    'total',    v_total,
    'withAge',  v_with,
    'avg',      (SELECT round(avg(age)::numeric, 1) FROM users WHERE age > 0),
    'median',   (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY age)::numeric, 1) FROM users WHERE age > 0),
    'min',      (SELECT min(age) FROM users WHERE age > 0),
    'max',      (SELECT max(age) FROM users WHERE age > 0),
    'coverage', CASE WHEN v_total > 0 THEN round(v_with::numeric / v_total * 100) ELSE 0 END,
    'distribution', jsonb_build_array(
      jsonb_build_object('rango', '< 18',  'usuarios', (SELECT count(*) FROM users WHERE age BETWEEN 1 AND 17)),
      jsonb_build_object('rango', '18-24', 'usuarios', (SELECT count(*) FROM users WHERE age BETWEEN 18 AND 24)),
      jsonb_build_object('rango', '25-34', 'usuarios', (SELECT count(*) FROM users WHERE age BETWEEN 25 AND 34)),
      jsonb_build_object('rango', '35-44', 'usuarios', (SELECT count(*) FROM users WHERE age BETWEEN 35 AND 44)),
      jsonb_build_object('rango', '45+',   'usuarios', (SELECT count(*) FROM users WHERE age >= 45))
    )
  ) INTO res;
  RETURN res;
END $$;

-- 6) Eventos crudos y tendencias (para la sección "Eventos y tendencias").
CREATE OR REPLACE FUNCTION public.admin_event_stats(p_days int DEFAULT 30)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  WITH ev AS (
    SELECT event_name, created_at FROM analytics_events
    WHERE created_at >= now() - (p_days - 1) * interval '1 day'
  ),
  byday AS (SELECT created_at::date AS day, count(*) AS c FROM ev GROUP BY 1),
  byname AS (SELECT event_name, count(*) AS c FROM ev GROUP BY 1),
  tx AS (
    SELECT created_at::date AS day, sum(amount) AS s FROM wallet_transactions
    WHERE type = 'deposit' AND created_at >= now() - (p_days - 1) * interval '1 day'
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'userTrend',    (SELECT coalesce(jsonb_agg(jsonb_build_object('d', to_char(day, 'YYYY-MM-DD'), 'users', c)   ORDER BY day), '[]'::jsonb) FROM byday),
    'eventStats',   (SELECT coalesce(jsonb_agg(jsonb_build_object('name', event_name, 'value', c)               ORDER BY c DESC), '[]'::jsonb) FROM byname),
    'revenueTrend', (SELECT coalesce(jsonb_agg(jsonb_build_object('d', to_char(day, 'YYYY-MM-DD'), 'revenue', s) ORDER BY day), '[]'::jsonb) FROM tx)
  ) INTO res;
  RETURN res;
END $$;

-- 7) KPIs globales de la tabla de Trabajos (para los contadores con paginación server-side).
CREATE OR REPLACE FUNCTION public.admin_jobs_stats()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT jsonb_build_object(
    'total',    (SELECT count(*) FROM jobs),
    'external', (SELECT count(*) FROM jobs WHERE is_external = true)
  ) INTO res;
  RETURN res;
END $$;

-- Permisos: solo administradores autenticados.
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.admin_engagement_metrics()',
    'public.admin_funnel()',
    'public.admin_applications_trend(int)',
    'public.admin_user_growth(int)',
    'public.admin_age_analytics()',
    'public.admin_event_stats(int)',
    'public.admin_jobs_stats()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
  END LOOP;
END $$;

-- 8) Dashboard en UNA sola llamada: sumas/conteos agregados en Postgres + feeds
--    acotados. Antes el hook bajaba TODOS los depósitos/pagos/audit_logs al navegador
--    para sumarlos/contarlos en JS (crecía con los datos).
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE res jsonb; v_rate numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'No autorizado'; END IF;
  SELECT coalesce((value ->> 'commission_rate')::numeric, 10) INTO v_rate FROM app_config WHERE id = 'global_settings';
  v_rate := coalesce(v_rate, 10);
  SELECT jsonb_build_object(
    'users',       (SELECT count(*) FROM users),
    'chambas',     (SELECT count(*) FROM chambas WHERE status <> 'completed'),
    'reports',     (SELECT count(*) FROM chamba_reports WHERE status = 'pending'),
    'revenue',     (SELECT coalesce(sum(amount), 0) FROM wallet_transactions WHERE type = 'deposit' AND status = 'completed'),
    'commission',  (SELECT coalesce(sum(amount * v_rate / 100.0), 0) FROM payments WHERE status = 'released'),
    'activeUsers', (SELECT count(DISTINCT user_id) FROM analytics_events WHERE created_at >= now() - interval '30 days' AND user_id IS NOT NULL),
    'pendingTx', (
      SELECT coalesce(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) FROM (
        SELECT wt.id, wt.type, wt.amount, wt.created_at, jsonb_build_object('full_name', u.full_name) AS users
        FROM wallet_transactions wt LEFT JOIN users u ON u.id = wt.user_id
        WHERE wt.status = 'pending'
        ORDER BY wt.created_at DESC LIMIT 10
      ) t
    ),
    'recentActivity', (
      SELECT coalesce(jsonb_agg(a ORDER BY a.created_at DESC), '[]'::jsonb) FROM (
        SELECT al.id, al.action, al.created_at, u.full_name
        FROM audit_logs al LEFT JOIN users u ON u.id = al.user_id
        ORDER BY al.created_at DESC LIMIT 8
      ) a
    )
  ) INTO res;
  RETURN res;
END $$;

REVOKE ALL  ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
REVOKE ALL  ON FUNCTION public.admin_dashboard_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;
