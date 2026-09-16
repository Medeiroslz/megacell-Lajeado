import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { resolveProductImageUrlSync } from "@/lib/product-images";
import type { PreorderSettings } from "@/lib/catalog-types";

async function fetchPreorderAdmin(): Promise<PreorderSettings | null> {
  const { data, error } = await supabase
    .from("preorder_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as PreorderSettings | null;
}

export function PreorderManager() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["preorder", "admin"], queryFn: fetchPreorderAdmin });
  const [form, setForm] = useState<Partial<PreorderSettings>>({});
  const [initialized, setInitialized] = useState(false);
  const [giftsText, setGiftsText] = useState("");
  const [uploading, setUploading] = useState(false);

  if (q.data && !initialized) {
    setForm(q.data);
    setGiftsText((q.data.gifts ?? []).join("\n"));
    setInitialized(true);
  }

  const payload = () => ({
    ...form,
    gifts: giftsText.split("\n").map((g) => g.trim()).filter(Boolean),
  });

  const save = useMutation({
    mutationFn: async () => {
      const body = payload();
      if (!q.data) {
        const { error } = await supabase.from("preorder_settings").insert(body as never);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("preorder_settings").update(body).eq("id", q.data.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Pré-venda salva");
      qc.invalidateQueries({ queryKey: ["preorder"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `preorder/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    setForm((f) => ({ ...f, image_path: path }));
    toast.success("Foto enviada — clique em Salvar");
  };

  if (q.isLoading) return <div className="text-muted-foreground">Carregando…</div>;

  const preview = form.image_path ? resolveProductImageUrlSync(form.image_path) : "";

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold">Pré-venda</h1>
      <div className="surface-card space-y-4 p-6">
        <div className="flex items-center justify-between rounded-[var(--radius-lg)] bg-surface p-4">
          <div>
            <div className="font-medium">Mostrar botão no site</div>
            <div className="text-xs text-muted-foreground">Liga/desliga a chamada da pré-venda no topo do site.</div>
          </div>
          <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
        </div>

        <F label="Texto do botão">
          <Input value={form.button_label ?? ""} onChange={(e) => setForm({ ...form, button_label: e.target.value })} className="bg-background" />
        </F>
        <F label="Título do card">
          <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background" />
        </F>
        <F label="Subtítulo">
          <Input value={form.subtitle ?? ""} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="bg-background" />
        </F>
        <F label="Regras da pré-venda" hint="Uma regra por linha.">
          <Textarea rows={8} value={form.rules ?? ""} onChange={(e) => setForm({ ...form, rules: e.target.value })} className="bg-background" />
        </F>
        <F label="Informação do sinal">
          <Input value={form.deposit_info ?? ""} onChange={(e) => setForm({ ...form, deposit_info: e.target.value })} className="bg-background" />
        </F>
        <F label="Brindes" hint="Um brinde por linha. O cliente escolhe um antes de solicitar.">
          <Textarea rows={4} value={giftsText} onChange={(e) => setGiftsText(e.target.value)} className="bg-background" />
        </F>
        <F label="Foto do aparelho">
          <div className="flex items-center gap-3">
            {preview && (
              <div className="relative">
                <img src={preview} alt="" className="h-24 w-24 rounded-[var(--radius-lg)] bg-surface object-contain" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, image_path: "" })}
                  className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-brand text-brand-foreground"
                  aria-label="Remover foto"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-lg)] border border-border px-4 py-2 text-sm">
              <Upload className="h-4 w-4" /> {uploading ? "Enviando…" : "Selecionar foto"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
        </F>
        <F label="Texto do aceite">
          <Input value={form.agree_label ?? ""} onChange={(e) => setForm({ ...form, agree_label: e.target.value })} className="bg-background" />
        </F>
        <F label="Texto do botão de solicitação">
          <Input value={form.cta_label ?? ""} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} className="bg-background" />
        </F>
        <F label="URL WhatsApp da pré-venda" hint="A mensagem com o brinde escolhido é adicionada automaticamente.">
          <Input value={form.whatsapp_url ?? ""} onChange={(e) => setForm({ ...form, whatsapp_url: e.target.value })} className="bg-background" placeholder="https://wa.me/5551982752030" />
        </F>

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-brand text-brand-foreground hover:bg-brand/90">
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
