-- Chamba — Ofertas externas scrapeadas
-- Almacena referencias (no copias completas) a ofertas publicadas en sitios
-- de terceros. La app redirige al usuario a `source_url` para ver el detalle.

CREATE TABLE IF NOT EXISTS public.jobs_external (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificación de origen
  source           VARCHAR(50)  NOT NULL,   -- p.ej. 'trabajopolis', 'buscojobs'
  external_id      VARCHAR(255) NOT NULL,   -- id/slug estable del sitio fuente
  source_url       TEXT         NOT NULL,   -- URL canónica de la oferta

  -- Datos mínimos para listado (sin copiar descripción completa)
  title            VARCHAR(500) NOT NULL,
  company          VARCHAR(255),
  location         VARCHAR(255),
  snippet          VARCHAR(500),            -- resumen corto (máx ~300 chars)
  category         VARCHAR(100),
  posted_at        TIMESTAMP WITH TIME ZONE, -- fecha publicación en el origen

  -- Metadata de scraping
  scraped_at       TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_seen_at     TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_active        BOOLEAN DEFAULT TRUE,    -- false si la oferta ya no aparece

  created_at       TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  CONSTRAINT jobs_external_source_ext_id_unique UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_external_source        ON public.jobs_external(source);
CREATE INDEX IF NOT EXISTS idx_jobs_external_is_active     ON public.jobs_external(is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_external_scraped_at    ON public.jobs_external(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_external_posted_at     ON public.jobs_external(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_external_category      ON public.jobs_external(category);

-- Trigger updated_at (función ya creada en 001_init_schema.sql)
CREATE TRIGGER handle_jobs_external_updated_at
  BEFORE UPDATE ON public.jobs_external
  FOR EACH ROW EXECUTE FUNCTION public.moddatetime();

-- Registro de corridas del scraper (para monitoreo)
CREATE TABLE IF NOT EXISTS public.scraper_runs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source           VARCHAR(50) NOT NULL,
  started_at       TIMESTAMP WITH TIME ZONE NOT NULL,
  finished_at      TIMESTAMP WITH TIME ZONE,
  status           VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failure', 'partial')),
  jobs_found       INTEGER DEFAULT 0,
  jobs_inserted    INTEGER DEFAULT 0,
  jobs_updated     INTEGER DEFAULT 0,
  error_message    TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scraper_runs_source     ON public.scraper_runs(source);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_started_at ON public.scraper_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_runs_status     ON public.scraper_runs(status);

-- RLS: lectura pública de ofertas activas, escritura solo con service role
ALTER TABLE public.jobs_external ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_runs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ofertas externas activas son públicas"
  ON public.jobs_external FOR SELECT
  USING (is_active = TRUE);

-- scraper_runs sólo visible a admins
CREATE POLICY "Admins leen scraper_runs"
  ON public.scraper_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

GRANT SELECT ON public.jobs_external TO anon, authenticated;
GRANT SELECT ON public.scraper_runs  TO authenticated;
