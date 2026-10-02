import { supabase } from "@/integrations/supabase/client";

const PRODUCT_IMAGES_BUCKET = "product-images";

function extractPathFromStorageUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const markers = [
      `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`,
      `/storage/v1/object/sign/${PRODUCT_IMAGES_BUCKET}/`,
      `/storage/v1/object/authenticated/${PRODUCT_IMAGES_BUCKET}/`,
    ];
    for (const marker of markers) {
      const i = url.pathname.indexOf(marker);
      if (i >= 0) {
        const p = url.pathname.slice(i + marker.length).split("?")[0];
        return decodeURIComponent(p).replace(/^\/+/, "") || null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function getProductImagePath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const storagePath = extractPathFromStorageUrl(trimmed);
  if (storagePath) return storagePath;
  if (/^(https?:|blob:|data:)/i.test(trimmed)) return null;
  return trimmed.replace(/^\/+/, "");
}

function publicUrlFor(path: string): string {
  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function resolveProductImageUrlSync(value: string | null | undefined): string {
  const v = value?.trim();
  if (!v) return "";
  const path = getProductImagePath(v);
  if (!path) return v; // external/data URL
  return publicUrlFor(path);
}

export async function ensureProductImageUrls(_values: string[]): Promise<void> {
  // no-op: public bucket URLs resolve synchronously
}

export async function resolveProductImageUrl(value: string): Promise<string> {
  return resolveProductImageUrlSync(value);
}

export function useProductImageUrl(value: string | null | undefined): string {
  return resolveProductImageUrlSync(value);
}

export function useProductImageUrls(values: string[] | null | undefined): string[] {
  return (values ?? [])
    .map((v) => resolveProductImageUrlSync(v))
    .filter(Boolean);
}

export function normalizeProductImageValue(value: string): string {
  return getProductImagePath(value) ?? value.trim();
}
