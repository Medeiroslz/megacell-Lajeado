import { supabase } from "@/integrations/supabase/client";

export const DEPOIMENTOS_BUCKET = "depoimentos";

export function depoimentoImageUrl(path: string | null | undefined): string {
  const p = path?.trim();
  if (!p) return "";
  if (/^(https?:|blob:|data:)/i.test(p)) return p;
  const { data } = supabase.storage.from(DEPOIMENTOS_BUCKET).getPublicUrl(p.replace(/^\/+/, ""));
  return data.publicUrl;
}
