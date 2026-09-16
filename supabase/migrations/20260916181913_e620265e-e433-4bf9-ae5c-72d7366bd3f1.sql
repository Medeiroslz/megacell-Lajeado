ALTER TABLE public.preorder_settings
ADD COLUMN gift_images jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.preorder_settings.gift_images IS 'Map of gift name to optional product-images storage path';