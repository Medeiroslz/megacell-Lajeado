CREATE TABLE public.analytics_sessions (
  id uuid PRIMARY KEY,
  visitor_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  entry_path text NOT NULL DEFAULT '/',
  referrer text NOT NULL DEFAULT '',
  referrer_domain text NOT NULL DEFAULT '',
  utm_source text NOT NULL DEFAULT '',
  utm_medium text NOT NULL DEFAULT '',
  utm_campaign text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  device_type text NOT NULL DEFAULT 'desktop' CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  browser text NOT NULL DEFAULT '',
  os text NOT NULL DEFAULT '',
  pageviews_count integer NOT NULL DEFAULT 0 CHECK (pageviews_count >= 0),
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  is_bounce boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.analytics_sessions TO authenticated;
GRANT ALL ON public.analytics_sessions TO service_role;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Analytics sessions admin read" ON public.analytics_sessions FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.analytics_sessions(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  event_type text NOT NULL DEFAULT 'pageview',
  path text NOT NULL DEFAULT '/',
  title text NOT NULL DEFAULT '',
  product_id uuid,
  product_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Analytics events admin read" ON public.analytics_events FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX analytics_events_created_at_idx ON public.analytics_events (created_at);
CREATE INDEX analytics_events_session_idx ON public.analytics_events (session_id);
CREATE INDEX analytics_events_path_idx ON public.analytics_events (path);
CREATE INDEX analytics_events_visitor_idx ON public.analytics_events (visitor_id);
CREATE INDEX analytics_events_product_idx ON public.analytics_events (product_id) WHERE product_id IS NOT NULL;
CREATE INDEX analytics_sessions_started_idx ON public.analytics_sessions (started_at);
CREATE INDEX analytics_sessions_last_seen_idx ON public.analytics_sessions (last_seen_at);
CREATE INDEX analytics_sessions_visitor_idx ON public.analytics_sessions (visitor_id);

INSERT INTO public.analytics_sessions (id, visitor_id, started_at, last_seen_at, entry_path, referrer, device_type, pageviews_count, is_bounce)
SELECT CASE WHEN session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN session_id::uuid ELSE id END,
       COALESCE(NULLIF(session_id, ''), id::text), min(created_at), max(created_at), min(path), COALESCE(min(referrer), ''), COALESCE(min(device), 'desktop'), count(*)::integer, count(*) <= 1
FROM public.page_views
GROUP BY CASE WHEN session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN session_id::uuid ELSE id END, COALESCE(NULLIF(session_id, ''), id::text);

INSERT INTO public.analytics_events (session_id, visitor_id, path, product_id, product_name, created_at)
SELECT CASE WHEN session_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN session_id::uuid ELSE id END,
       COALESCE(NULLIF(session_id, ''), id::text), path, product_id, product_name, created_at
FROM public.page_views;

CREATE OR REPLACE FUNCTION public.analytics_report(p_from timestamptz, p_to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_pfrom timestamptz := p_from - (p_to - p_from);
  v_hourly boolean := (p_to - p_from) <= interval '2 days';
  v_result jsonb;
BEGIN
  IF p_from >= p_to OR p_to - p_from > interval '366 days' THEN RAISE EXCEPTION 'invalid date range'; END IF;
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  WITH
  cur_s AS (SELECT * FROM analytics_sessions WHERE started_at >= p_from AND started_at < p_to),
  prev_s AS (SELECT * FROM analytics_sessions WHERE started_at >= v_pfrom AND started_at < p_from),
  cur_e AS (SELECT * FROM analytics_events WHERE event_type = 'pageview' AND created_at >= p_from AND created_at < p_to),
  prev_e AS (SELECT * FROM analytics_events WHERE event_type = 'pageview' AND created_at >= v_pfrom AND created_at < p_from),
  buckets AS (SELECT b FROM generate_series(date_trunc(CASE WHEN v_hourly THEN 'hour' ELSE 'day' END, p_from AT TIME ZONE 'America/Sao_Paulo'), p_to AT TIME ZONE 'America/Sao_Paulo', CASE WHEN v_hourly THEN interval '1 hour' ELSE interval '1 day' END) b),
  ev_b AS (SELECT date_trunc(CASE WHEN v_hourly THEN 'hour' ELSE 'day' END, created_at AT TIME ZONE 'America/Sao_Paulo') b, count(*) pv, count(DISTINCT visitor_id) vis FROM cur_e GROUP BY 1),
  ss_b AS (SELECT date_trunc(CASE WHEN v_hourly THEN 'hour' ELSE 'day' END, started_at AT TIME ZONE 'America/Sao_Paulo') b, count(*) se, avg(CASE WHEN is_bounce THEN 1.0 ELSE 0 END) br, avg(duration_seconds) du FROM cur_s GROUP BY 1)
  SELECT jsonb_build_object(
    'hourly', v_hourly,
    'current', jsonb_build_object('visitors', (SELECT count(DISTINCT visitor_id) FROM cur_e), 'pageviews', (SELECT count(*) FROM cur_e), 'sessions', (SELECT count(*) FROM cur_s), 'bounce_rate', COALESCE((SELECT avg(CASE WHEN is_bounce THEN 100.0 ELSE 0 END) FROM cur_s), 0), 'avg_duration', COALESCE((SELECT avg(duration_seconds) FROM cur_s), 0)),
    'previous', jsonb_build_object('visitors', (SELECT count(DISTINCT visitor_id) FROM prev_e), 'pageviews', (SELECT count(*) FROM prev_e), 'sessions', (SELECT count(*) FROM prev_s), 'bounce_rate', COALESCE((SELECT avg(CASE WHEN is_bounce THEN 100.0 ELSE 0 END) FROM prev_s), 0), 'avg_duration', COALESCE((SELECT avg(duration_seconds) FROM prev_s), 0)),
    'series', COALESCE((SELECT jsonb_agg(jsonb_build_object('t', to_char(buckets.b, 'YYYY-MM-DD"T"HH24:MI'), 'visitors', COALESCE(ev_b.vis, 0), 'pageviews', COALESCE(ev_b.pv, 0), 'sessions', COALESCE(ss_b.se, 0), 'bounce_rate', COALESCE(ss_b.br * 100, 0), 'avg_duration', COALESCE(ss_b.du, 0)) ORDER BY buckets.b) FROM buckets LEFT JOIN ev_b ON ev_b.b = buckets.b LEFT JOIN ss_b ON ss_b.b = buckets.b), '[]'::jsonb),
    'pages', COALESCE((SELECT jsonb_agg(x) FROM (SELECT path AS label, count(*) AS value FROM cur_e GROUP BY path ORDER BY 2 DESC LIMIT 10) x), '[]'::jsonb),
    'top_products', COALESCE((SELECT jsonb_agg(x) FROM (SELECT COALESCE(product_name, 'Produto') AS label, count(*) AS value FROM cur_e WHERE product_id IS NOT NULL GROUP BY product_id, product_name ORDER BY 2 DESC LIMIT 10) x), '[]'::jsonb),
    'referrers', COALESCE((SELECT jsonb_agg(x) FROM (SELECT COALESCE(NULLIF(referrer_domain, ''), 'Direto') AS label, count(*) AS value FROM cur_s GROUP BY 1 ORDER BY 2 DESC LIMIT 10) x), '[]'::jsonb),
    'utm', COALESCE((SELECT jsonb_agg(x) FROM (SELECT utm_campaign AS label, max(utm_source) AS source, count(*) AS value FROM cur_s WHERE utm_campaign <> '' GROUP BY 1 ORDER BY 3 DESC LIMIT 10) x), '[]'::jsonb),
    'countries', COALESCE((SELECT jsonb_agg(x) FROM (SELECT COALESCE(NULLIF(country, ''), '??') AS label, count(DISTINCT visitor_id) AS value FROM cur_s GROUP BY 1 ORDER BY 2 DESC LIMIT 10) x), '[]'::jsonb),
    'devices', COALESCE((SELECT jsonb_agg(x) FROM (SELECT device_type AS label, count(*) AS value FROM cur_s GROUP BY 1 ORDER BY 2 DESC) x), '[]'::jsonb),
    'browsers', COALESCE((SELECT jsonb_agg(x) FROM (SELECT COALESCE(NULLIF(browser, ''), 'Outro') AS label, count(*) AS value FROM cur_s GROUP BY 1 ORDER BY 2 DESC LIMIT 8) x), '[]'::jsonb),
    'os', COALESCE((SELECT jsonb_agg(x) FROM (SELECT COALESCE(NULLIF(os, ''), 'Outro') AS label, count(*) AS value FROM cur_s GROUP BY 1 ORDER BY 2 DESC LIMIT 8) x), '[]'::jsonb),
    'online', (SELECT count(DISTINCT visitor_id) FROM analytics_sessions WHERE last_seen_at > now() - interval '5 minutes')
  ) INTO v_result;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.analytics_report(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_report(timestamptz, timestamptz) TO authenticated;