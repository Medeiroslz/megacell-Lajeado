CREATE TABLE public.preorder_settings (
  id uuid primary key default gen_random_uuid(),
  is_active boolean not null default false,
  button_label text not null default 'Pré-venda iPhone 18',
  title text not null default 'Pré-venda iPhone 18',
  subtitle text not null default 'Garanta o seu antes de todos',
  rules text not null default '',
  image_path text not null default '',
  deposit_info text not null default '',
  gifts text[] not null default '{}'::text[],
  agree_label text not null default 'Li e concordo com as regras da pré-venda',
  cta_label text not null default 'Solicitar pré-venda',
  whatsapp_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.preorder_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preorder_settings TO authenticated;
GRANT ALL ON public.preorder_settings TO service_role;

ALTER TABLE public.preorder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read preorder_settings" ON public.preorder_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert preorder_settings" ON public.preorder_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update preorder_settings" ON public.preorder_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete preorder_settings" ON public.preorder_settings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER preorder_settings_updated_at BEFORE UPDATE ON public.preorder_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
