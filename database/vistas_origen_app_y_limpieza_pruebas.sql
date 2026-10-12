-- 2026-10-12 · Limpieza de datos de prueba de dinero + origen de vistas.
-- Las vistas sin `source` son de la app móvil publicada (las versiones < 1.0.38
-- no mandaban el campo; la web siempre manda 'site').
create or replace view public.content_views_by_source as
 SELECT (date_trunc('day'::text, created_at))::date AS day,
    event_name,
    COALESCE(source, 'app'::text) AS source,
    COALESCE(platform, 'desconocido'::text) AS platform,
    count(*) AS views
   FROM analytics_events
  WHERE (event_name = ANY (ARRAY['view_job'::text, 'view_chamba'::text]))
  GROUP BY ((date_trunc('day'::text, created_at))::date), event_name, COALESCE(source, 'app'::text), COALESCE(platform, 'desconocido'::text);

create or replace view public.job_views_stats as
 SELECT ((e.properties ->> 'job_id'::text))::uuid AS job_id,
    j.title, j.company, j.city, j.status,
    count(*) AS views,
    count(*) FILTER (WHERE (COALESCE(e.source, 'app'::text) = 'app'::text)) AS views_app,
    count(*) FILTER (WHERE (e.source = 'site'::text)) AS views_site,
    count(*) FILTER (WHERE (e.created_at > (now() - '7 days'::interval))) AS views_7d,
    max(e.created_at) AS last_view
   FROM (analytics_events e
     JOIN jobs j ON ((j.id = ((e.properties ->> 'job_id'::text))::uuid)))
  WHERE ((e.event_name = 'view_job'::text) AND ((e.properties ->> 'job_id'::text) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text))
  GROUP BY ((e.properties ->> 'job_id'::text))::uuid, j.title, j.company, j.city, j.status;

create or replace view public.chamba_views_stats as
 SELECT ((e.properties ->> 'chamba_id'::text))::uuid AS chamba_id,
    c.title, c.city, c.status,
    count(*) AS views,
    count(*) FILTER (WHERE (COALESCE(e.source, 'app'::text) = 'app'::text)) AS views_app,
    count(*) FILTER (WHERE (e.source = 'site'::text)) AS views_site,
    count(*) FILTER (WHERE (e.created_at > (now() - '7 days'::interval))) AS views_7d,
    max(e.created_at) AS last_view
   FROM (analytics_events e
     JOIN chambas c ON ((c.id = ((e.properties ->> 'chamba_id'::text))::uuid)))
  WHERE ((e.event_name = 'view_chamba'::text) AND ((e.properties ->> 'chamba_id'::text) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text))
  GROUP BY ((e.properties ->> 'chamba_id'::text))::uuid, c.title, c.city, c.status;

-- Chambas de prueba (las de pago en custodia) y todo lo que colgaba de ellas.
create temp table _test_chambas on commit drop as
  select id from chambas where id in (
    'd03f221c-26b8-4955-b019-07b4b0f57f4d','8ebf310b-dc3e-466f-88aa-f5dae7721085','f057f5b3-0a0f-42cc-8a14-36d02e5ab71d');
delete from reviews where chamba_id in (select id from _test_chambas);
delete from chats   where chamba_id in (select id from _test_chambas);
delete from payments;
-- Los candados de "expediente inmutable" se levantan solo dentro de esta transacción.
alter table wallet_transactions disable trigger prevent_wallet_tx_delete;
alter table dispute_attachments disable trigger prevent_dispute_evidence_delete_trigger;
alter table dispute_messages    disable trigger prevent_dispute_message_change_trigger;
delete from wallet_transactions;
delete from chambas where id in (select id from _test_chambas);
alter table wallet_transactions enable trigger prevent_wallet_tx_delete;
alter table dispute_attachments enable trigger prevent_dispute_evidence_delete_trigger;
alter table dispute_messages    enable trigger prevent_dispute_message_change_trigger;

-- Todas las billeteras en 0.
update wallets set balance = 0, held_balance = 0 where balance <> 0 or held_balance <> 0;
