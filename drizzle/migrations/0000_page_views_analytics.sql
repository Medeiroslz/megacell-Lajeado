CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  path text NOT NULL,
  product_id uuid,
  product_name text,
  device text,
  referrer text,
  session_id text
);
GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT SELECT ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert page_views" ON public.page_views FOR INSERT TO anon, authenticated
  WITH CHECK (length(path) < 500 AND (device IS NULL OR device IN ('mobile','tablet','desktop')));
CREATE POLICY "Admins read page_views" ON public.page_views FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX page_views_created_at_idx ON public.page_views (created_at);

CREATE OR REPLACE FUNCTION public.analytics_summary(_days int)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = public AS $$
DECLARE since timestamptz := date_trunc('day', now()) - make_interval(days => greatest(_days,1) - 1);
BEGIN
  RETURN jsonb_build_object(
    'cards', (SELECT jsonb_build_object(
      'today_views', count(*) FILTER (WHERE created_at >= date_trunc('day', now())),
      'today_visitors', count(DISTINCT session_id) FILTER (WHERE created_at >= date_trunc('day', now())),
      'd7_views', count(*) FILTER (WHERE created_at >= now() - interval '7 days'),
      'd7_visitors', count(DISTINCT session_id) FILTER (WHERE created_at >= now() - interval '7 days'),
      'd30_views', count(*),
      'd30_visitors', count(DISTINCT session_id)
    ) FROM page_views WHERE created_at >= now() - interval '30 days'),
    'daily', COALESCE((SELECT jsonb_agg(jsonb_build_object('day', to_char(d,'DD/MM'), 'views', v, 'visitors', u) ORDER BY d) FROM (
      SELECT date_trunc('day', created_at) d, count(*) v, count(DISTINCT session_id) u
      FROM page_views WHERE created_at >= since GROUP BY 1) s), '[]'::jsonb),
    'devices', COALESCE((SELECT jsonb_agg(jsonb_build_object('device', coalesce(device,'desconhecido'), 'views', v)) FROM (
      SELECT device, count(*) v FROM page_views WHERE created_at >= since GROUP BY 1) s), '[]'::jsonb),
    'top_products', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', product_name, 'views', v) ORDER BY v DESC) FROM (
      SELECT product_name, count(*) v FROM page_views WHERE created_at >= since AND product_id IS NOT NULL
      GROUP BY product_name ORDER BY 2 DESC LIMIT 10) s), '[]'::jsonb)
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.analytics_summary(int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.analytics_summary(int) TO authenticated;