import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Gift, Check, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
  const giftImages = cfg.gift_images ?? {};
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
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-preorder-border bg-preorder p-0 text-preorder-foreground [&>button]:text-preorder-foreground">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={cfg.title}
              className="max-h-72 w-full rounded-t-[var(--radius-lg)] bg-preorder-surface object-contain"
            />
          )}
          <div className="space-y-5 p-6">
            <div className="text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                <Sparkles className="h-3.5 w-3.5" /> Pré-venda
              </span>
              <DialogTitle className="mt-3 text-2xl font-semibold text-preorder-foreground">{cfg.title}</DialogTitle>
              {cfg.subtitle && <p className="mt-1 text-sm text-preorder-muted">{cfg.subtitle}</p>}
            </div>

            {cfg.rules.trim() && (
              <div className="rounded-[var(--radius-lg)] border border-preorder-border bg-preorder-surface p-4">
                <h3 className="text-sm font-semibold">Regras da pré-venda</h3>
                <p className="mt-2 whitespace-pre-line text-sm text-preorder-muted">{cfg.rules}</p>
              </div>
            )}

            {cfg.deposit_info.trim() && (
              <p className="rounded-[var(--radius-lg)] border border-brand/40 bg-brand/10 px-4 py-3 text-sm">
                <strong>Sinal:</strong> {cfg.deposit_info}
              </p>
            )}

            {gifts.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Gift className="h-4 w-4 text-brand" /> Escolha seu brinde
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {gifts.map((g) => (
                    <Button
                      key={g}
                      type="button"
                      variant="outline"
                      onClick={() => setGift(g)}
                      className={`h-auto min-h-11 overflow-hidden rounded-[var(--radius-lg)] p-0 transition ${
                        gift === g
                          ? "border-brand bg-brand/15 text-preorder-foreground ring-2 ring-brand/40"
                          : "border-preorder-border bg-preorder-surface text-preorder-muted hover:border-brand/60 hover:bg-preorder-surface hover:text-preorder-foreground"
                      }`}
                    >
                      <span className="flex w-full flex-col">
                        {giftImages[g] && (
                          <img
                            src={resolveProductImageUrlSync(giftImages[g])}
                            alt={g}
                            className="aspect-square w-full bg-preorder-surface object-cover"
                          />
                        )}
                        <span className="flex min-h-11 items-center justify-center gap-1.5 px-2 py-2 text-center text-xs sm:text-sm">
                          {gift === g && <Check className="h-3.5 w-3.5 shrink-0 text-brand" />} {g}
                        </span>
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-lg)] border border-preorder-border bg-preorder-surface p-4">
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
            <p className="text-center text-xs text-preorder-muted">
              Você será direcionado ao WhatsApp para confirmar o valor do sinal e o brinde.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
