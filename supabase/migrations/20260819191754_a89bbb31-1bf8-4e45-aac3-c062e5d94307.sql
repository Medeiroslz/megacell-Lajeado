CREATE TABLE public.depoimentos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_path text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.depoimentos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.depoimentos TO authenticated;
GRANT ALL ON public.depoimentos TO service_role;

ALTER TABLE public.depoimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active depoimentos" ON public.depoimentos FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Authenticated can read all depoimentos" ON public.depoimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert depoimentos" ON public.depoimentos FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update depoimentos" ON public.depoimentos FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete depoimentos" ON public.depoimentos FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER depoimentos_updated_at BEFORE UPDATE ON public.depoimentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();