import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Copy, Upload, X, LogOut, Search, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, categoryLabel, isValidUrl, safeOpenUrl } from "@/lib/format";
import type { Product, StoreSettings, Category, Depoimento } from "@/lib/catalog-types";
import { normalizeProductImageValue, useProductImageUrl } from "@/lib/product-images";
import { DEPOIMENTOS_BUCKET, depoimentoImageUrl } from "@/lib/depoimento-images";

const CATEGORIES: Category[] = ["iphone", "macbook", "ipad", "watch", "acessorios"];

export function AdminDashboard({ user }: { user: User }) {
  const [tab, setTab] = useState<"products" | "depoimentos" | "settings">("products");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">M</span>
            <div>
              <div className="text-sm font-semibold">Mega Cell Admin</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground">Ver site →</a>
            <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
              <LogOut className="mr-1.5 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl gap-2 px-4">
          <TabBtn active={tab === "products"} onClick={() => setTab("products")}>Produtos</TabBtn>
          <TabBtn active={tab === "depoimentos"} onClick={() => setTab("depoimentos")}>Depoimentos</TabBtn>
          <TabBtn active={tab === "settings"} onClick={() => setTab("settings")}>Configurações</TabBtn>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === "products" ? <ProductsManager /> : tab === "depoimentos" ? <DepoimentosManager /> : <SettingsManager />}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-3 text-sm ${active ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}

/* ============ PRODUCTS ============ */

async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Product[];
}

function ProductsManager() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["products", "admin"], queryFn: fetchAllProducts });
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<"all" | Category>("all");
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const filtered = (q.data ?? []).filter((p) => {
    if (catFilter !== "all" && p.category !== catFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleAvail = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("products").update({ is_available: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Produto excluído"); qc.invalidateQueries({ queryKey: ["products"] }); setConfirmDelete(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const dup = useMutation({
    mutationFn: async (product: Product) => {
      const { id, created_at, updated_at, ...rest } = product;
      const payload = { ...rest, name: `${product.name} - Cópia`, is_available: false };
      const { error } = await supabase.from("products").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Produto duplicado"); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Produtos</h1>
        <Button onClick={() => setCreating(true)} className="bg-brand text-brand-foreground hover:bg-brand/90">
          <Plus className="mr-1.5 h-4 w-4" /> Novo produto
        </Button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome…" className="bg-surface pl-9" />
        </div>
        <Select value={catFilter} onValueChange={(v) => setCatFilter(v as "all" | Category)}>
          <SelectTrigger className="w-full bg-surface sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="surface-card overflow-hidden">
        {q.isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhum produto.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-3">Produto</th>
                <th className="p-3 hidden md:table-cell">Categoria</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Disp.</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <ProductThumb image={p.images?.[0]} name={p.name} />
                      <div className="font-medium">{p.name}</div>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{categoryLabel(p.category)}</td>
                  <td className="p-3 tabular-nums">{formatBRL(p.price)}</td>
                  <td className="p-3">
                    <Switch checked={p.is_available}
                      onCheckedChange={(v) => toggleAvail.mutate({ id: p.id, value: v })} />
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => dup.mutate(p)} disabled={dup.isPending}><Copy className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(p)}><Trash2 className="h-4 w-4 text-brand" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(creating || editing) && (
        <ProductFormDialog
          product={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => qc.invalidateQueries({ queryKey: ["products"] })}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>“{confirmDelete?.name}” será removido permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && del.mutate(confirmDelete.id)}
              className="bg-brand text-brand-foreground hover:bg-brand/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============ PRODUCT FORM ============ */

type FormState = {
  name: string;
  category: Category;
  price: string;
  installment_12x: string;
  installment_label: string;
  description: string;
  specs: Record<string, string>;
  extrasText: string;
  images: string[];
  is_available: boolean;
  cta_url: string;
  cta_url_luisa: string;
  cta_label: string;
};

const SELLERS = {
  romulo: { name: "Romulo", phone: "5551982752030" },
  kelly: { name: "Kelly", phone: "5551982474584" },
} as const;

const SPECS_FIELDS: Record<Category, string[]> = {
  iphone: ["Armazenamento", "Cor", "Bateria", "Garantia", "Condição", "Acessórios"],
  macbook: ["Processador", "Memória RAM", "Armazenamento", "Tela", "Cor", "Ciclos de bateria", "Condição", "Garantia"],
  ipad: ["Armazenamento", "Conectividade", "Cor", "Tela", "Bateria", "Condição", "Garantia"],
  watch: ["Tamanho", "Caixa", "Pulseira", "Conectividade", "Bateria", "Condição", "Garantia"],
  acessorios: ["Tipo", "Cor", "Compatibilidade", "Condição", "Garantia"],
};

function splitSpecs(category: Category, existing?: Record<string, string>): { specs: Record<string, string>; extras: Record<string, string> } {
  const fields = SPECS_FIELDS[category];
  const specs: Record<string, string> = {};
  fields.forEach((f) => { specs[f] = existing?.[f] ?? ""; });
  const extras: Record<string, string> = {};
  Object.entries(existing ?? {}).forEach(([k, v]) => { if (!fields.includes(k) && v) extras[k] = v; });
  return { specs, extras };
}

function extrasToText(extras: Record<string, string>): string {
  return Object.entries(extras).map(([k, v]) => `${k}: ${v}`).join("\n");
}
function textToExtras(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  text.split("\n").forEach((line) => {
    const i = line.indexOf(":");
    if (i > 0) {
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim();
      if (k) out[k] = v;
    }
  });
  return out;
}

function mergedSpecs(form: FormState): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(form.specs).forEach(([k, v]) => { if (v && v.trim()) out[k] = v.trim(); });
  Object.entries(textToExtras(form.extrasText)).forEach(([k, v]) => { if (v) out[k] = v; });
  return out;
}

function emptyForm(): FormState {
  const { specs } = splitSpecs("iphone");
  return { name: "", category: "iphone", price: "", installment_12x: "", installment_label: "", description: "", specs, extrasText: "", images: [], is_available: true, cta_url: "", cta_url_luisa: "", cta_label: "Falar no WhatsApp" };
}

function buildWhatsAppLink(form: FormState, phone: string): string {
  const specs = mergedSpecs(form);
  const price = Number(form.price.replace(",", ".")) || 0;
  const isAccessory = form.category === "acessorios";
  const installment = Number(form.installment_12x.replace(",", ".")) || price / 12;
  const paymentPart = isAccessory
    ? (form.installment_label.trim() ? `(${form.installment_label.trim()})` : "")
    : `ou em 12x de ${formatBRL(installment)} no cartao`;
  const parts = [
    "Ola Mega Cell, tenho interesse no",
    form.name,
    specs["Armazenamento"],
    specs["Bateria"] ? `${specs["Bateria"]}%` : "",
    specs["Cor"],
    specs["Condição"],
    `R$${formatBRL(price).replace("R$", "").trim()} av`,
    paymentPart,
  ].filter(Boolean);
  const message = parts.join(" ").replace(/\s+/g, " ").replace(" ou em", ", ou em");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function ProductFormDialog({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(() => {
    if (!product) return emptyForm();
    const { specs, extras } = splitSpecs(product.category, (product.specs ?? {}) as Record<string, string>);
    return {
      name: product.name, category: product.category, price: String(product.price),
      installment_12x: product.installment_12x ? String(product.installment_12x) : "",
      installment_label: product.installment_label ?? "",
      description: product.description ?? "", specs, extrasText: extrasToText(extras),
      images: product.images ?? [], is_available: product.is_available,
      cta_url: product.cta_url ?? "", cta_url_luisa: product.cta_url_luisa ?? "",
      cta_label: product.cta_label || "Falar no WhatsApp",
    };
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name}: formato inválido`); continue; }
      if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name}: máximo 8MB`); continue; }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) { toast.error(error.message); continue; }
      uploaded.push(path);
    }
    setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }));
    setUploading(false);
  };

  const removeImage = (i: number) => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const price = Number(form.price.replace(",", "."));
    if (!isFinite(price) || price < 0) { toast.error("Preço inválido"); return; }
    if (form.cta_url && !isValidUrl(form.cta_url)) { toast.error("URL do CTA (Romulo) inválida"); return; }
    if (form.cta_url_luisa && !isValidUrl(form.cta_url_luisa)) { toast.error("URL do CTA (Kelly) inválida"); return; }
    setSaving(true);
    const isAccessory = form.category === "acessorios";
    const installment = !isAccessory && form.installment_12x.trim() ? Number(form.installment_12x.replace(",", ".")) : 0;
    if (!isAccessory && !isFinite(installment) || installment < 0) { toast.error("Valor da parcela inválido"); setSaving(false); return; }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      price,
      installment_12x: installment,
      installment_label: isAccessory ? form.installment_label.trim().slice(0, 60) : "",
      description: form.description,
      specs: mergedSpecs(form),
      images: form.images.map(normalizeProductImageValue).filter(Boolean),
      is_available: form.is_available,
      cta_url: form.cta_url.trim(),
      cta_url_luisa: form.cta_url_luisa.trim(),
      cta_label: form.cta_label.trim() || "Falar no WhatsApp",
    };
    const res = product
      ? await supabase.from("products").update(payload).eq("id", product.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(product ? "Produto atualizado" : "Produto criado");
    onSaved();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-4xl flex-col overflow-hidden border-border bg-surface p-0">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 overflow-y-auto px-6 py-4 md:grid-cols-2">

          <div className="space-y-4">
            <Field label="Nome">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-background" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria">
                <Select value={form.category} onValueChange={(v) => {
                  const nextCat = v as Category;
                  const { specs } = splitSpecs(nextCat, { ...form.specs, ...textToExtras(form.extrasText) });
                  // Re-bucket: keep matching keys in fixed fields, push the rest to extras
                  const fixedKeys = SPECS_FIELDS[nextCat];
                  const combined = { ...form.specs, ...textToExtras(form.extrasText) };
                  const newExtras: Record<string, string> = {};
                  Object.entries(combined).forEach(([k, v]) => { if (!fixedKeys.includes(k) && v) newExtras[k] = v; });
                  setForm({ ...form, category: nextCat, specs, extrasText: extrasToText(newExtras) });
                }}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Preço (R$)">
                <Input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-background" placeholder="0,00" />
              </Field>
            </div>
            {form.category === "acessorios" ? (
              <Field label="Parcelamento (texto livre)" hint="Aparece no card no lugar de '12x de R$ ...'. Ex.: 'à vista', '2x sem juros', 'sem parcelamento'. Deixe em branco para ocultar.">
                <Input value={form.installment_label} onChange={(e) => setForm({ ...form, installment_label: e.target.value })} className="bg-background" placeholder="à vista" maxLength={60} />
              </Field>
            ) : (
              <Field label="Valor da parcela em 12x (R$)" hint="Aparece no card como '12x de R$ ...'. Deixe em branco para calcular automaticamente (preço ÷ 12).">
                <Input inputMode="decimal" value={form.installment_12x} onChange={(e) => setForm({ ...form, installment_12x: e.target.value })} className="bg-background" placeholder="0,00" />
              </Field>
            )}
            <Field label="Descrição">
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-background" />
            </Field>
            <Field label="Especificações" hint="Campos fixos por categoria. Preencha apenas a informação de cada produto.">
              <div className="grid grid-cols-2 gap-2">
                {SPECS_FIELDS[form.category].map((key) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{key}</Label>
                    <Input
                      value={form.specs[key] ?? ""}
                      onChange={(e) => setForm({ ...form, specs: { ...form.specs, [key]: e.target.value } })}
                      className="bg-background"
                    />
                  </div>
                ))}
              </div>
            </Field>
            <Field label="Especificações extras (opcional)" hint="Uma por linha no formato chave: valor">
              <Textarea rows={3} value={form.extrasText} onChange={(e) => setForm({ ...form, extrasText: e.target.value })} className="bg-background font-mono text-xs"
                placeholder={"Ex.: Tela: Super Retina XDR"} />
            </Field>
            <Field label="URL WhatsApp — Vendedor Romulo" hint="Gera link para +55 51 98275-2030.">
              <div className="flex gap-2">
                <Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} className="bg-background" placeholder="https://wa.me/5551982752030?text=..." />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm({ ...form, cta_url: buildWhatsAppLink(form, SELLERS.romulo.phone) });
                    toast.success("Link de Romulo gerado");
                  }}
                >
                  Gerar link
                </Button>
              </div>
            </Field>
            <Field label="URL WhatsApp — Vendedora Kelly" hint="Gera link para +55 51 98247-4584.">
              <div className="flex gap-2">
                <Input value={form.cta_url_luisa} onChange={(e) => setForm({ ...form, cta_url_luisa: e.target.value })} className="bg-background" placeholder="https://wa.me/5551982474584?text=..." />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm({ ...form, cta_url_luisa: buildWhatsAppLink(form, SELLERS.kelly.phone) });
                    toast.success("Link de Kelly gerado");
                  }}
                >
                  Gerar link
                </Button>
              </div>
            </Field>
            <Field label="Texto do botão">
              <Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} className="bg-background" />
            </Field>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_available} onCheckedChange={(v) => setForm({ ...form, is_available: v })} />
              <span className="text-sm">{form.is_available ? "Disponível" : "Indisponível"}</span>
            </div>
            <Field label="Imagens">
              <div className="space-y-3">
                <label className="surface-card flex cursor-pointer items-center justify-center gap-2 border-dashed bg-background py-6 text-sm text-muted-foreground hover:text-foreground">
                  <Upload className="h-4 w-4" /> {uploading ? "Enviando…" : "Selecionar imagens"}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onUpload(e.target.files); e.target.value = ""; }} />
                </label>
                {form.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {form.images.map((src, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-md bg-surface-elevated">
                        <img src={src} alt="" className="h-full w-full object-cover" />
                        <button type="button" onClick={() => removeImage(i)}
                          className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground hover:bg-background">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>
          </div>

          <div>
            <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Preview ao vivo</div>
            <PreviewCard form={form} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border bg-surface px-6 py-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-brand text-brand-foreground hover:bg-brand/90">
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ProductThumb({ image, name }: { image: string | undefined; name: string }) {
  const src = useProductImageUrl(image);
  return (
    <div className="h-10 w-10 overflow-hidden rounded bg-surface-elevated">
      {src && <img src={src} alt={name} className="h-full w-full object-cover" />}
    </div>
  );
}

function PreviewCard({ form }: { form: FormState }) {
  const cover = useProductImageUrl(form.images[0]);
  const specs = mergedSpecs(form);
  const price = Number(form.price.replace(",", ".")) || 0;
  return (
    <div className="surface-card overflow-hidden">
      <div className="relative aspect-square w-full overflow-hidden bg-surface-elevated">
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-muted-foreground">Sem foto</div>}
        <span className="absolute left-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          {categoryLabel(form.category)}
        </span>
      </div>
      <div className="space-y-3 p-5">
        <h3 className="font-semibold leading-tight">{form.name || "Nome do produto"}</h3>
        {Object.keys(specs).length > 0 && (
          <ul className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            {Object.entries(specs).slice(0, 4).map(([k, v]) => <li key={k} className="rounded-md bg-accent px-2 py-0.5">{String(v)}</li>)}
          </ul>
        )}
        <div className="flex items-end justify-between gap-3 pt-1">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">à vista</div>
            <div className="text-xl font-semibold text-primary">{formatBRL(price)}</div>
            {form.category === "acessorios" ? (
              form.installment_label.trim() && <div className="text-[11px] text-muted-foreground mt-0.5">{form.installment_label}</div>
            ) : (
              <div className="text-[11px] text-muted-foreground mt-0.5">
                ou 12x de {formatBRL(Number(form.installment_12x.replace(",", ".")) || price / 12)}
              </div>
            )}
          </div>
          <Button
            type="button"
            onClick={() => { const ok = safeOpenUrl(form.cta_url); if (!ok) toast.message("URL inválida ou vazia"); }}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {form.cta_label || "Falar no WhatsApp"}
          </Button>
        </div>
      </div>
    </div>
  );
}


/* ============ DEPOIMENTOS ============ */

async function fetchDepoimentos(): Promise<Depoimento[]> {
  const { data, error } = await supabase
    .from("depoimentos")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Depoimento[];
}

function DepoimentosManager() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["depoimentos", "admin"], queryFn: fetchDepoimentos });
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Depoimento | null>(null);
  const items = q.data ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["depoimentos"] });

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    let base = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name}: formato inválido`); continue; }
      if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name}: máximo 8MB`); continue; }
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(DEPOIMENTOS_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) { toast.error(up.error.message); continue; }
      const ins = await supabase.from("depoimentos").insert({ image_path: path, sort_order: base++ });
      if (ins.error) { toast.error(ins.error.message); continue; }
    }
    setUploading(false);
    toast.success("Depoimentos enviados");
    invalidate();
  };

  const toggle = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("depoimentos").update({ is_active: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAlt = useMutation({
    mutationFn: async ({ id, alt }: { id: string; alt: string }) => {
      const { error } = await supabase.from("depoimentos").update({ alt_text: alt }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Texto alternativo salvo"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async ({ index, dir }: { index: number; dir: -1 | 1 }) => {
      const target = index + dir;
      if (target < 0 || target >= items.length) return;
      const a = items[index];
      const b = items[target];
      const r1 = await supabase.from("depoimentos").update({ sort_order: b.sort_order }).eq("id", a.id);
      if (r1.error) throw r1.error;
      const r2 = await supabase.from("depoimentos").update({ sort_order: a.sort_order }).eq("id", b.id);
      if (r2.error) throw r2.error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (d: Depoimento) => {
      const { error } = await supabase.from("depoimentos").delete().eq("id", d.id);
      if (error) throw error;
      await supabase.storage.from(DEPOIMENTOS_BUCKET).remove([d.image_path]);
    },
    onSuccess: () => { toast.success("Depoimento removido"); setConfirmDelete(null); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Depoimentos</h1>
          <p className="text-sm text-muted-foreground">Prints de avaliações do Google, Instagram ou WhatsApp.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-[var(--radius-lg)] bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:bg-brand/90">
          <Upload className="h-4 w-4" /> {uploading ? "Enviando…" : "Enviar prints"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
        </label>
      </div>

      {q.isLoading ? (
        <div className="surface-card p-8 text-center text-muted-foreground">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="surface-card p-8 text-center text-muted-foreground">Nenhum depoimento enviado ainda.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d, i) => (
            <DepoimentoCard
              key={d.id}
              item={d}
              onToggle={(v) => toggle.mutate({ id: d.id, value: v })}
              onAlt={(alt) => saveAlt.mutate({ id: d.id, alt })}
              onUp={() => move.mutate({ index: i, dir: -1 })}
              onDown={() => move.mutate({ index: i, dir: 1 })}
              onDelete={() => setConfirmDelete(d)}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover depoimento?</AlertDialogTitle>
            <AlertDialogDescription>A imagem será apagada permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && del.mutate(confirmDelete)}
              className="bg-brand text-brand-foreground hover:bg-brand/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DepoimentoCard({
  item, onToggle, onAlt, onUp, onDown, onDelete,
}: {
  item: Depoimento;
  onToggle: (v: boolean) => void;
  onAlt: (alt: string) => void;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  const [alt, setAlt] = useState(item.alt_text ?? "");
  return (
    <div className="surface-card overflow-hidden">
      <img src={depoimentoImageUrl(item.image_path)} alt={item.alt_text || "Print de avaliação"} className="w-full" />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={item.is_active} onCheckedChange={onToggle} />
            <span className="text-sm text-muted-foreground">{item.is_active ? "Ativo" : "Inativo"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onUp} aria-label="Subir"><ArrowUp className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={onDown} aria-label="Descer"><ArrowDown className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={onDelete} aria-label="Remover"><Trash2 className="h-4 w-4 text-brand" /></Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Texto alternativo (opcional)" className="bg-background" />
          <Button variant="outline" size="sm" onClick={() => onAlt(alt.trim())}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}

/* ============ SETTINGS ============ */

function SettingsManager() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<StoreSettings | null> => {
      const { data, error } = await supabase.from("store_settings").select("*").order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (error) throw error;
      return data as StoreSettings | null;
    },
  });
  const [form, setForm] = useState<Partial<StoreSettings>>({});
  const [initialized, setInitialized] = useState(false);
  if (q.data && !initialized) { setForm(q.data); setInitialized(true); }

  const save = useMutation({
    mutationFn: async () => {
      if (!q.data) {
        const { error } = await supabase.from("store_settings").insert(form);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_settings").update(form).eq("id", q.data.id);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Configurações salvas"); qc.invalidateQueries({ queryKey: ["settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) return <div className="text-muted-foreground">Carregando…</div>;

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-semibold">Configurações da loja</h1>
      <div className="surface-card space-y-4 p-6">
        <Field label="Nome da loja">
          <Input value={form.store_name ?? ""} onChange={(e) => setForm({ ...form, store_name: e.target.value })} className="bg-background" />
        </Field>
        <Field label="Subtítulo (itálico do hero)">
          <Input value={form.tagline ?? ""} onChange={(e) => setForm({ ...form, tagline: e.target.value })} className="bg-background" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="@Instagram">
            <Input value={form.instagram_handle ?? ""} onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })} className="bg-background" />
          </Field>
          <Field label="URL do Instagram">
            <Input value={form.instagram_url ?? ""} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} className="bg-background" />
          </Field>
        </div>
        <Field label="Endereço completo">
          <Textarea rows={2} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-background" />
        </Field>
        <Field label="Cidade / Estado">
          <Input value={form.city_state ?? ""} onChange={(e) => setForm({ ...form, city_state: e.target.value })} className="bg-background" />
        </Field>
        <Field label="Razão social (rodapé)">
          <Input value={form.legal_name ?? ""} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} className="bg-background" />
        </Field>
        <Field label="URL WhatsApp — Contato principal" hint="Usado pelo botão 'Falar no WhatsApp' no topo do site.">
          <Input value={form.whatsapp_url ?? ""} onChange={(e) => setForm({ ...form, whatsapp_url: e.target.value })} className="bg-background" placeholder="https://wa.me/5551999999999?text=..." />
        </Field>
        <Field label="URL WhatsApp — Orçamento de reparo" hint="Aparece como botão no topo do site, ao lado do selo de garantia.">
          <div className="flex gap-2">
            <Input value={form.repair_quote_url ?? ""} onChange={(e) => setForm({ ...form, repair_quote_url: e.target.value })} className="bg-background" placeholder="https://wa.me/5551982752030?text=..." />
            <Button
              type="button"
              variant="outline"
              onClick={() => setForm({ ...form, repair_quote_url: `https://wa.me/${SELLERS.romulo.phone}?text=${encodeURIComponent("Olá Romulo, gostaria de solicitar um orçamento de reparo.")}` })}
            >
              Usar Romulo
            </Button>
          </div>
        </Field>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-brand text-brand-foreground hover:bg-brand/90">
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
