import { trackView } from "@/lib/analytics";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import {
  Search, MapPin, Instagram, ShieldCheck, ChevronLeft, ChevronRight, Wrench, X,
  Apple, Smartphone, Gamepad2, Joystick, CreditCard, Banknote, Zap, Store,
  MessageCircle, LayoutGrid, Laptop, Tablet, Watch, Headphones,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { PreorderPromo } from "@/components/PreorderPromo";
import logo from "@/assets/logo.png";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mega Cell — iPhones em Lajeado, RS" },
      { name: "description", content: "iPhones e acessórios na Mega Cell, Lajeado/RS. Loja Física, atendimento rápido no WhatsApp e estoque atualizado." },
      { property: "og:title", content: "Mega Cell — iPhones em Lajeado, RS" },
      { property: "og:description", content: "iPhones e acessórios na Mega Cell, Lajeado/RS. Loja Física, atendimento rápido no WhatsApp e estoque atualizado." },
    ],
  }),
  component: Landing,
});

type SortKey = "price_desc" | "price_asc" | "category";
const TABS: { id: "all" | Category; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "iphone", label: "iPhones" },
  { id: "xiaomi", label: "Xiaomi" },
  { id: "macbook", label: "MacBooks" },
  { id: "ipad", label: "iPads" },
  { id: "watch", label: "Apple Watch's" },
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
      const order: Category[] = ["iphone", "xiaomi", "macbook", "ipad", "watch", "acessorios"];
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
      <Benefits />
      <section id="produtos" className="mx-auto max-w-[980px] scroll-mt-24 px-4 pb-16">
        <div className="pt-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Nossos <span className="text-primary">Produtos</span>
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Escolha uma categoria e fale direto com a gente no WhatsApp.</p>
        </div>
        <CategoryCircles tab={tab} setTab={setTab} />
        <Filters
          search={search} setSearch={setSearch}
          sort={sort} setSort={setSort}
        />
        {tab !== "all" && (
          <h3 className="mt-10 text-center text-2xl font-semibold">{TABS.find((t) => t.id === tab)?.label}</h3>
        )}
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
      <Testimonials />
      <WhySection />
      <PaymentMethods />
      <FaqSection />
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

function installmentValue(product: Product, n: 12 | 18): number {
  const custom = n === 12 ? product.installment_12x : product.installment_18x;
  return custom && custom > 0 ? custom : product.price / n;
}


export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const cls = size === "sm" ? "h-7" : size === "lg" ? "h-20 sm:h-24 lg:h-28" : "h-10 sm:h-11";
  if (failed) {
    return (
      <span className={`font-display font-bold leading-none tracking-tight ${size === "lg" ? "text-4xl sm:text-5xl" : "text-xl"}`}>
        <span className="text-brand">MEGA</span> <span className="text-primary">CELL</span>
      </span>
    );
  }
  return (
    <img
      src={logo}
      alt="Mega Cell"
      width={2701}
      height={857}
      onError={() => setFailed(true)}
      className={`${cls} w-auto select-none ${size === "lg" ? "drop-shadow-[0_10px_30px_rgba(0,0,0,0.12)]" : ""}`}
      draggable={false}
    />
  );
}



function BrandIcons({ className = "" }: { className?: string }) {
  const hover =
    "cursor-pointer transition-all duration-200 ease-out hover:scale-125 hover:-translate-y-0.5 hover:text-brand hover:drop-shadow-[0_3px_6px_color-mix(in_oklab,var(--brand)_35%,transparent)]";
  return (
    <span aria-hidden="true" className={`items-center gap-2 opacity-70 ${className}`}>
      <Apple className={`h-4 w-4 ${hover}`} />
      <Smartphone className={`h-4 w-4 ${hover}`} />
      <Gamepad2 className={`h-4 w-4 ${hover}`} />
      <Joystick className={`h-4 w-4 ${hover}`} />
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
  void openWhatsApp;
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-surface to-brand/10 px-4">
      <div aria-hidden className="absolute -right-24 top-10 h-[420px] w-[420px] rounded-full bg-primary/20 blur-[120px]" />
      <div aria-hidden className="absolute -left-20 bottom-0 h-[300px] w-[300px] rounded-full bg-brand/15 blur-[110px]" />
      <div className="relative mx-auto flex min-h-[560px] max-w-[980px] flex-col justify-center gap-6 pb-36 pt-14 text-center md:text-left">
        <h1 className="sr-only">Mega Cell — iPhones em Lajeado, RS</h1>
        <div className="flex justify-center md:justify-start">
          <Logo size="lg" />
        </div>
        <p className="font-display text-2xl font-medium leading-tight sm:text-3xl md:max-w-[560px]">
          {settings?.tagline?.trim() || "Atendemos pessoas extraordinárias desde 2020"}
        </p>
        <p className="mx-auto max-w-[549px] text-base text-muted-foreground md:mx-0">
          iPhones e acessórios com <span className="font-medium text-primary">procedência garantida</span> em Lajeado/RS.
          {" "}{loading ? "" : `${total} produtos no estoque agora.`}
        </p>
        <BrandIcons className="inline-flex justify-center text-muted-foreground md:justify-start" />
        <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
          <a href="#produtos" className="inline-flex items-center gap-2 rounded-full border border-foreground px-6 py-3 text-sm font-medium transition-colors hover:bg-foreground/5">
            <Apple className="h-4 w-4" /> Ver produtos
          </a>
          <Button onClick={openRepair} className="h-auto rounded-full bg-brand px-6 py-3 text-brand-foreground hover:bg-brand/90">
            <Wrench className="mr-2 h-4 w-4" /> Solicitar reparo
          </Button>
          <PreorderPromo />
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    { icon: Store, text: "Loja Física em Lajeado" },
    { icon: ShieldCheck, text: "Garantia e procedência" },
    { icon: CreditCard, text: "Parcele em até 18x" },
    { icon: Zap, text: "Pix com confirmação na hora" },
    { icon: MessageCircle, text: "Atendimento rápido no WhatsApp" },
  ];
  return (
    <section className="px-4">
      <div className="relative z-10 mx-auto -mt-24 grid max-w-[980px] grid-cols-2 gap-6 rounded-[22px] border border-border bg-card px-5 py-8 shadow-[0_20px_50px_-25px_color-mix(in_oklab,var(--foreground)_35%,transparent)] sm:grid-cols-3 md:grid-cols-5">
        {items.map(({ icon: Icon, text }) => (
          <div key={text} className="flex flex-col items-center gap-3 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </span>
            <h3 className="max-w-[140px] text-sm font-medium leading-snug">{text}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}

const TAB_ICONS: Record<string, typeof Apple> = {
  all: LayoutGrid, iphone: Smartphone, xiaomi: Smartphone, macbook: Laptop, ipad: Tablet, watch: Watch, acessorios: Headphones,
};

function CategoryCircles({ tab, setTab }: { tab: "all" | Category; setTab: (v: "all" | Category) => void }) {
  return (
    <div className="mt-10 flex flex-wrap justify-center gap-5 sm:gap-8">
      {TABS.map((t) => {
        const Icon = TAB_ICONS[t.id];
        const active = t.id === tab;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex h-[110px] w-[110px] flex-col items-center justify-center gap-2 rounded-full border transition-transform hover:scale-[1.04] sm:h-[140px] sm:w-[140px] ${
              active
                ? "border-primary bg-gradient-to-b from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25"
                : "border-border bg-gradient-to-b from-card to-surface-elevated text-foreground hover:border-primary/60"
            }`}
          >
            <Icon className="h-7 w-7 sm:h-9 sm:w-9" />
            <span className="px-2 text-center text-sm sm:text-[15px]">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function WhySection() {
  const items = [
    ["Procedência garantida", "Todos os aparelhos são revisados e têm origem comprovada."],
    ["Loja física", "Venha conhecer, testar e retirar seu aparelho pessoalmente em Lajeado."],
    ["Atendimento humano", "Romulo e Kelly respondem rápido no WhatsApp e tiram todas as dúvidas."],
    ["Assistência técnica", "Precisa de reparo? Fazemos orçamento rápido e sem compromisso."],
  ];
  return (
    <section className="px-4 py-20">
      <div className="mx-auto max-w-[980px]">
        <h2 className="text-3xl font-semibold tracking-tight">
          Por que comprar na <span className="text-primary">Mega Cell</span>?
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(([title, text], i) => (
            <div key={title} className="surface-card p-6">
              <div className="font-display text-4xl font-bold text-brand">{String(i + 1).padStart(2, "0")}</div>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const faqs = [
    ["Vocês aceitam boleto?", "Não trabalhamos com boleto. Aceitamos Pix, dinheiro e cartão em até 18x."],
    ["Os aparelhos têm garantia?", "Sim, todos os produtos têm garantia e procedência. Consulte as condições de cada aparelho no WhatsApp."],
    ["Onde fica a loja?", "Nossa loja física fica em Lajeado/RS. O endereço completo está no rodapé do site."],
    ["Como faço para comprar?", "Escolha o produto, toque em “Falar no WhatsApp” e selecione Romulo ou Kelly para finalizar seu atendimento."],
    ["Vocês fazem reparos?", "Sim! Toque em “Solicitar reparo” no topo do site para pedir um orçamento."],
  ];
  return (
    <section className="px-4 pb-20">
      <div className="mx-auto max-w-[980px]">
        <h2 className="text-center text-3xl font-semibold tracking-tight">
          Perguntas <span className="text-primary">frequentes</span>
        </h2>
        <Accordion type="single" collapsible className="mt-8 surface-card px-6">
          {faqs.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-left">{q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function PaymentMethods() {
  const items = [
    { icon: Zap, label: "Pix", hint: "Confirmação na hora" },
    { icon: Banknote, label: "Dinheiro", hint: "À vista na loja" },
    { icon: CreditCard, label: "Cartão até 18x", hint: "Crédito e débito" },
  ];
  return (
    <section className="mx-auto max-w-[980px] px-4 pb-16">
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
  search, setSearch, sort, setSort,
}: {
  search: string; setSearch: (v: string) => void;
  sort: SortKey; setSort: (v: SortKey) => void;
}) {
  return (
    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por modelo, cor ou armazenamento…"
          className="h-11 rounded-full border-border bg-surface pl-9 text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
        <SelectTrigger className="h-11 w-full rounded-full border-border bg-surface sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="category">Ordem por categoria</SelectItem>
          <SelectItem value="price_desc">Maior preço</SelectItem>
          <SelectItem value="price_asc">Menor preço</SelectItem>
        </SelectContent>
      </Select>
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
          onClick={() => pick(product.cta_url, "Romulo")}
          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent"
        >
          <span>Vendedor <span className="font-medium">Romulo</span></span>
          <span className="text-xs text-muted-foreground">WhatsApp</span>
        </button>
        <button
          type="button"
          onClick={() => pick(product.cta_url_luisa, "Kelly")}
          className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent"
        >
          <span>Vendedora <span className="font-medium">Kelly</span></span>
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
            Solicitar fotos
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
                12x de <span className="font-medium text-foreground">{formatBRL(installmentValue(product, 12))}</span>
                {" ou "}18x de <span className="font-medium text-foreground">{formatBRL(installmentValue(product, 18))}</span>
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
  useEffect(() => {
    setIdx(0);
    if (product) trackView({ product_id: product.id, product_name: product.name });
  }, [product?.id]);
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
                Solicitar fotos
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
                  12x de <span className="font-medium text-foreground">{formatBRL(installmentValue(product, 12))}</span>
                  {" ou "}18x de <span className="font-medium text-foreground">{formatBRL(installmentValue(product, 18))}</span>
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
