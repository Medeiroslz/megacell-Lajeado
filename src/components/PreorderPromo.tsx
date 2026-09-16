import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Gift, Check, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { safeOpenUrl } from "@/lib/format";
import { resolveProductImageUrlSync } from "@/lib/product-images";
import type { PreorderSettings } from "@/lib/catalog-types";

export async function fetchPreorder(): Promise<PreorderSettings | null> {
  const { data, error } = await supabase
    .from("preorder_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as PreorderSettings | null;
}

function buildWhatsAppUrl(base: string, message: string): string | null {
  try {
    const u = new URL(base);
    if (!["http:", "https:"].includes(u.protocol)) return null;
    u.searchParams.set("text", message);
    return u.toString();
  } catch {
    return null;
  }
}

export function PreorderPromo() {
  const q = useQuery({ queryKey: ["preorder", "public"], queryFn: fetchPreorder });
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [gift, setGift] = useState("");

  const cfg = q.data;
  if (!cfg || !cfg.is_active) return null;

  const gifts = (cfg.gifts ?? []).filter((g) => g.trim());
  const imageUrl = cfg.image_path ? resolveProductImageUrlSync(cfg.image_path) : "";

  const request = () => {
    if (!agreed) return;
    const message = [
      `Olá! Quero fazer a pré-venda do ${cfg.title}.`,
      "Li e concordo com as regras da pré-venda.",
      gift ? `Brinde escolhido: ${gift}.` : "Gostaria de escolher meu brinde.",
      "Podem confirmar o valor do sinal para reservar?",
    ].join(" ");
    const url = buildWhatsAppUrl(cfg.whatsapp_url?.trim() || "", message);
    if (!url) {
      toast.error("Link do WhatsApp da pré-venda ainda não configurado.");
      return;
    }
    if (safeOpenUrl(url)) setOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="group relative h-auto overflow-hidden rounded-[var(--radius-xl)] bg-brand px-5 py-3 text-brand-foreground shadow-lg shadow-brand/25 hover:bg-brand/90"
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <Smartphone className="mr-2 h-4 w-4" /> {cfg.button_label || "Pré-venda iPhone 18"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto p-0">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={cfg.title}
              className="max-h-72 w-full rounded-t-[var(--radius-lg)] bg-surface object-contain"
            />
          )}
          <div className="space-y-5 p-6">
            <div className="text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                <Sparkles className="h-3.5 w-3.5" /> Pré-venda
              </span>
              <h2 className="mt-3 text-2xl font-semibold">{cfg.title}</h2>
              {cfg.subtitle && <p className="mt-1 text-sm text-muted-foreground">{cfg.subtitle}</p>}
            </div>

            {cfg.rules.trim() && (
              <div className="rounded-[var(--radius-lg)] bg-surface p-4">
                <h3 className="text-sm font-semibold">Regras da pré-venda</h3>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{cfg.rules}</p>
              </div>
            )}

            {cfg.deposit_info.trim() && (
              <p className="rounded-[var(--radius-lg)] border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                <strong>Sinal:</strong> {cfg.deposit_info}
              </p>
            )}

            {gifts.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Gift className="h-4 w-4 text-brand" /> Escolha seu brinde
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {gifts.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGift(g)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                        gift === g
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-border bg-surface text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {gift === g && <Check className="h-3.5 w-3.5" />} {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-lg)] border border-border p-4">
              <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
              <span className="text-sm">{cfg.agree_label || "Li e concordo com as regras da pré-venda"}</span>
            </label>

            <Button
              onClick={request}
              disabled={!agreed}
              className="w-full bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
            >
              {cfg.cta_label || "Solicitar pré-venda"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Você será direcionado ao WhatsApp para confirmar o valor do sinal e o brinde.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
