import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import {
  Search, MapPin, Instagram, ShieldCheck, ChevronLeft, ChevronRight, Wrench, X,
  Apple, Smartphone, Gamepad2, Joystick, MessageCircle, CreditCard, Banknote, Zap, Store,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatBRL, categoryLabel, safeOpenUrl } from "@/lib/format";
import type { Product, StoreSettings, Category } from "@/lib/catalog-types";
import { toast } from "sonner";
import { useProductImageUrls } from "@/lib/product-images";
import { Testimonials } from "@/components/Testimonials";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mega Cell — iPhones em Lajeado, RS" },
      { name: "description", content: "iPhones e acessórios na Mega Cell, Lajeado/RS. Duas lojas físicas, atendimento rápido no WhatsApp e estoque atualizado." },
      { property: "og:title", content: "Mega Cell — iPhones em Lajeado, RS" },
      { property: "og:description", content: "iPhones e acessórios na Mega Cell, Lajeado/RS. Duas lojas físicas, atendimento rápido no WhatsApp e estoque atualizado." },
    ],
  }),
  component: Landing,
});

type SortKey = "price_desc" | "price_asc" | "category";
const TABS: { id: "all" | Category; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "iphone", label: "iPhones" },
  { id: "macbook", label: "MacBooks" },
  { id: "ipad", label: "iPads" },
  { id: "watch", label: "Apple Watches" },
  { id: "acessorios", label: "Acessórios" },
];

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_available", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Product[];
}

async function fetchSettings(): Promise<StoreSettings | null> {
  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as StoreSettings | null;
}

function Landing() {
  const productsQ = useQuery({ queryKey: ["products", "public"], queryFn: fetchProducts, refetchInterval: 30000 });
  const settingsQ = useQuery({ queryKey: ["settings"], queryFn: fetchSettings });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("category");
  const [tab, setTab] = useState<"all" | Category>("all");
  const [modal, setModal] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const list = (productsQ.data ?? []).filter((p) => {
      if (tab !== "all" && p.category !== tab) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${p.name} ${categoryLabel(p.category)} ${Object.values(p.specs ?? {}).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorted = [...list];
    if (sort === "price_desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "price_asc") sorted.sort((a, b) => a.price - b.price);
    else {
      const order: Category[] = ["iphone", "macbook", "ipad", "watch", "acessorios"];
      sorted.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.price - b.price);
    }
    return sorted;
  }, [productsQ.data, search, sort, tab]);

  const totalAvailable = productsQ.data?.length ?? 0;
  const settings = settingsQ.data;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header settings={settings} />
      <Hero settings={settings} total={totalAvailable} loading={productsQ.isLoading} />
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <Filters
          search={search} setSearch={setSearch}
          sort={sort} setSort={setSort}
          tab={tab} setTab={setTab}
        />
        {productsQ.isLoading ? (
          <Loading />
        ) : productsQ.isError ? (
          <div className="surface-card mt-8 p-10 text-center text-muted-foreground">Erro ao carregar produtos.</div>
        ) : filtered.length === 0 ? (
          <EmptyState hasAny={totalAvailable > 0} />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={() => setModal(p)} />
            ))}
          </div>
        )}
      </section>
      <PaymentMethods />
      <Testimonials />
      <Footer settings={settings} />
      <ProductModal product={modal} onClose={() => setModal(null)} />
    </main>
  );
}

function Header({ settings }: { settings: StoreSettings | null | undefined }) {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 60000);
    return () => clearInterval(id);
  }, []);
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <BrandIcons className="hidden text-muted-foreground sm:flex" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted-foreground">
            <span className="live-dot" /> Atualizado às {now}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Estoque ao vivo
          </span>
          {settings?.instagram_url && (
            <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <Instagram className="h-4 w-4" />
              {settings.instagram_handle}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const cls = size === "sm" ? "text-lg" : "text-2xl";
  return (
    <span className={`font-display font-bold tracking-tight ${cls}`}>
      <span className="text-brand">MEGA</span>
      <span className="text-primary"> CELL</span>
    </span>
  );
}

function BrandIcons({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`items-center gap-2 opacity-70 ${className}`}>
      <Apple className="h-4 w-4" />
      <Smartphone className="h-4 w-4" />
      <Gamepad2 className="h-4 w-4" />
      <Joystick className="h-4 w-4" />
    </span>
  );
}

function Hero({ settings, total, loading }: { settings: StoreSettings | null | undefined; total: number; loading: boolean }) {
  const openRepair = () => {
    const url = settings?.repair_quote_url?.trim();
    if (!url) { toast.error("Link de orçamento ainda não configurado."); return; }
    const ok = safeOpenUrl(url);
    if (!ok) toast.error("Link de orçamento inválido.");
  };
  const openWhatsApp = () => {
    const url = settings?.whatsapp_url?.trim() || settings?.repair_quote_url?.trim();
    if (!url) { toast.error("Link do WhatsApp ainda não configurado."); return; }
    const ok = safeOpenUrl(url);
    if (!ok) toast.error("Link do WhatsApp inválido.");
  };
  return (
    <section className="relative mx-auto max-w-6xl px-4 pt-4 pb-4 sm:pt-6 sm:pb-5 text-center overflow-hidden">
      {/* Glow effect */}
      <div className="absolute left-1/2 top-0 -z-10 h-[250px] w-[400px] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]" />
      
      <div className="flex flex-col items-center gap-4">
      <div className="space-y-2">
          <h1 className="text-center text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            <span className="inline-block">
              <span className="text-brand">MEGA</span> <span className="text-primary">CELL</span>
            </span>
            <span className="block text-xl font-medium text-foreground/80 mt-3 sm:text-2xl lg:text-3xl">
              {settings?.tagline?.trim() || "Atendemos pessoas extraordinárias desde 2020"}
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
            iPhones e acessórios com procedência garantida em Lajeado/RS. Duas lojas físicas para você conhecer de perto
            e atendimento rápido pelo WhatsApp.
          </p>
          <BrandIcons className="mt-1 inline-flex justify-center text-muted-foreground" />
        </div>
        
        <div className="flex flex-wrap justify-center items-center gap-3 text-sm">
          <div className="surface-card flex items-baseline gap-2 px-5 py-3 shadow-lg shadow-primary/5 border-primary/20">
            <span className="text-3xl font-bold text-primary tabular-nums">{loading ? "—" : total}</span>
            <span className="text-muted-foreground font-medium">produtos no estoque</span>
          </div>
          <div className="surface-card inline-flex items-center gap-2 px-5 py-3 text-muted-foreground border-border">
            <Store className="h-4 w-4 text-primary" /> 2 lojas físicas em Lajeado
          </div>
          {settings?.city_state && (
            <div className="surface-card inline-flex items-center gap-2 px-5 py-3 text-muted-foreground border-border">
              <MapPin className="h-4 w-4 text-primary" /> {settings.city_state}
            </div>
          )}
          <div className="surface-card hidden sm:inline-flex items-center gap-2 px-5 py-3 text-muted-foreground border-border">
            <ShieldCheck className="h-4 w-4 text-primary" /> Garantia e Procedência
          </div>
          <Button
            onClick={openWhatsApp}
            className="h-auto rounded-[var(--radius-xl)] bg-brand px-5 py-3 text-brand-foreground hover:bg-brand/90"
          >
            <MessageCircle className="mr-2 h-4 w-4" /> Falar no WhatsApp
          </Button>
          <Button
            onClick={openRepair}
            variant="outline"
            className="h-auto rounded-[var(--radius-xl)] px-5 py-3"
          >
            <Wrench className="mr-2 h-4 w-4" /> Solicitar orçamento de reparo
          </Button>
        </div>
      </div>
    </section>
  );
}

function PaymentMethods() {
  const items = [
    { icon: Zap, label: "Pix", hint: "Confirmação na hora" },
    { icon: Banknote, label: "Dinheiro", hint: "À vista na loja" },
    { icon: CreditCard, label: "Cartão até 12x", hint: "Crédito e débito" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 pb-12">
      <div className="surface-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold sm:text-2xl">Formas de pagamento</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {items.map(({ icon: Icon, label, hint }) => (
            <div key={label} className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-surface p-4">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <div className="font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">{hint}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-5 rounded-[var(--radius-lg)] border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-foreground">
          <strong>Importante:</strong> não trabalhamos com boleto.
        </p>
      </div>
    </section>
  );
}

function Filters({
  search, setSearch, sort, setSort, tab, setTab,
}: {
  search: string; setSearch: (v: string) => void;
  sort: SortKey; setSort: (v: SortKey) => void;
  tab: "all" | Category; setTab: (v: "all" | Category) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por modelo, cor ou armazenamento…"
            className="h-11 border-border bg-surface pl-9 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-11 w-full border-border bg-surface sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="category">Ordem por categoria</SelectItem>
            <SelectItem value="price_desc">Maior preço</SelectItem>
            <SelectItem value="price_asc">Menor preço</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SellerPicker({ product, children }: { product: Product; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pick = (url: string, name: string) => {
    setOpen(false);
    if (!url) { toast.error(`Link de ${name} indisponível para este produto.`); return; }
    const ok = safeOpenUrl(url);
    if (!ok) toast.error(`Link de ${name} inválido.`);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-56 border-border bg-surface p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2 pb-2 pt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          Falar com
        </div>
        <button
          type="button"
          onClick={() => pick(product.cta_url, "Thiago")}
          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent"
        >
          <span>Vendedor <span className="font-medium">Thiago</span></span>
          <span className="text-xs text-muted-foreground">WhatsApp</span>
        </button>
        <button
          type="button"
          onClick={() => pick(product.cta_url_luisa, "Luísa")}
          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent"
        >
          <span>Vendedora <span className="font-medium">Luísa</span></span>
          <span className="text-xs text-muted-foreground">WhatsApp</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}

function ProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const imgs = useProductImageUrls(product.images);
  const [idx, setIdx] = useState(0);
  const hasMany = imgs.length > 1;
  const cover = imgs[idx];
  const handleImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen();
  };
  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i + 1) % imgs.length);
  };
  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i - 1 + imgs.length) % imgs.length);
  };
  return (
    <article
      onClick={onOpen}
      className="surface-card group relative flex cursor-pointer flex-col overflow-hidden transition hover:border-primary/60 hover:shadow-[0_10px_40px_-14px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
    >
      <button
        type="button"
        onClick={handleImage}
        className="relative block aspect-square w-full overflow-hidden bg-surface-elevated"
        aria-label={`Ver detalhes de ${product.name}`}
      >
        {imgs.length > 0 ? (
          <div className="relative h-full w-full">
            {imgs.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={product.name}
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 group-hover:scale-105 ${i === idx ? "opacity-100" : "opacity-0"}`}
              />
            ))}
          </div>
        ) : (
          <div className="grid h-full w-full place-items-center text-sm font-medium text-muted-foreground">
            Solicitar foto para o vendedor
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground backdrop-blur">
          {categoryLabel(product.category)}
        </span>
        {hasMany && (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-1.5 text-foreground shadow-md border border-border hover:bg-background transition opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Próxima foto"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-1.5 text-foreground shadow-md border border-border hover:bg-background transition opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {imgs.map((_, i) => (
                <span key={i} className={`h-1 w-3 rounded-full ${i === idx ? "bg-primary" : "bg-foreground/30"}`} />
              ))}
            </div>
          </>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-base font-semibold leading-tight">{product.name}</h3>
        {product.specs && Object.keys(product.specs).length > 0 && (
          <ul className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            {Object.entries(product.specs).slice(0, 4).map(([k, v]) => (
              <li key={k} className="rounded-md bg-accent px-2 py-0.5">{String(v)}</li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">à vista</div>
            <div className="text-xl font-semibold text-primary">{formatBRL(product.price)}</div>
            {product.category === "acessorios" ? (
              product.installment_label && <div className="text-[11px] text-muted-foreground mt-0.5">{product.installment_label}</div>
            ) : (
              <div className="text-[11px] text-muted-foreground mt-0.5">
                ou 12x de <span className="font-medium text-foreground">{formatBRL(product.installment_12x && product.installment_12x > 0 ? product.installment_12x : product.price / 12)}</span>
              </div>
            )}
          </div>
          <SellerPicker product={product}>
            <Button onClick={(e) => e.stopPropagation()} className="bg-brand text-brand-foreground hover:bg-brand/90">
              {product.cta_label || "Falar no WhatsApp"}
            </Button>
          </SellerPicker>
        </div>
      </div>
    </article>
  );
}


function ProductModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const imgs = useProductImageUrls(product?.images);
  useEffect(() => { setIdx(0); }, [product?.id]);
  if (!product) return null;
  const next = () => setIdx((i) => (i + 1) % Math.max(imgs.length, 1));
  const prev = () => setIdx((i) => (i - 1 + Math.max(imgs.length, 1)) % Math.max(imgs.length, 1));
  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-3xl max-h-[90vh] overflow-y-auto border-border bg-surface p-0">
        <button
          type="button"
          onClick={onClose}
          className="fixed top-4 right-4 z-[60] rounded-full border border-border bg-background/80 p-2 text-foreground backdrop-blur hover:bg-background"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="grid gap-0 md:grid-cols-2">
          <div className="relative aspect-square bg-surface-elevated">
            {imgs[idx] ? (
              <img src={imgs[idx]} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-sm font-medium text-muted-foreground">
                Solicitar foto para o vendedor
              </div>
            )}
            {imgs.length > 1 && (
              <>
                <button aria-label="Foto anterior" onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2.5 text-foreground shadow-lg border border-border hover:bg-background transition">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button aria-label="Próxima foto" onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/90 p-2.5 text-foreground shadow-lg border border-border hover:bg-background transition">
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {imgs.map((_, i) => (
                    <button key={i} onClick={() => setIdx(i)}
                      className={`h-1.5 w-4 rounded-full ${i === idx ? "bg-primary" : "bg-foreground/30"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col gap-4 p-6">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{categoryLabel(product.category)}</div>
              <h2 className="mt-1 text-xl font-semibold pr-8">{product.name}</h2>
            </div>
            <div>
              <div className="text-3xl font-semibold text-primary">{formatBRL(product.price)}</div>
              {product.category === "acessorios" ? (
                product.installment_label && <div className="text-sm text-muted-foreground mt-1">{product.installment_label}</div>
              ) : (
                <div className="text-sm text-muted-foreground mt-1">
                  ou 12x de <span className="font-medium text-foreground">{formatBRL(product.installment_12x && product.installment_12x > 0 ? product.installment_12x : product.price / 12)}</span>
                </div>
              )}
            </div>
            {product.description && (
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{product.description}</p>
            )}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(product.specs).map(([k, v]) => (
                  <div key={k} className="rounded-md bg-accent px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                    <dd className="text-foreground">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
            <SellerPicker product={product}>
              <Button className="mt-auto h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90">
                {product.cta_label || "Falar no WhatsApp"}
              </Button>
            </SellerPicker>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Loading() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="surface-card animate-pulse">
          <div className="aspect-square bg-surface-elevated" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-2/3 rounded bg-accent" />
            <div className="h-3 w-1/2 rounded bg-accent" />
            <div className="h-9 w-full rounded bg-accent" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="surface-card mt-8 p-12 text-center">
      <p className="text-base text-foreground">{hasAny ? "Nenhum produto corresponde aos filtros." : "Nenhum produto cadastrado ainda."}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hasAny ? "Tente ajustar a busca ou trocar de categoria." : "Fale com a Mega Cell no WhatsApp para saber o que temos disponível hoje."}</p>
    </div>
  );
}

function Footer({ settings }: { settings: StoreSettings | null | undefined }) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <div className="text-foreground font-semibold">{settings?.store_name ?? "Mega Cell"}</div>
            <div className="mt-1">© {year} {settings?.legal_name ?? settings?.store_name ?? "Mega Cell"}. Todos os direitos reservados.</div>
          </div>
          <div>
            <div className="text-foreground font-semibold">Endereço</div>
            <div className="mt-1 whitespace-pre-line">{settings?.address || "—"}</div>
            <div>{settings?.city_state}</div>
          </div>
          <div>
            <div className="text-foreground font-semibold">Redes</div>
            {settings?.instagram_url && (
              <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 hover:text-foreground">
                <Instagram className="h-4 w-4" /> {settings.instagram_handle}
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
