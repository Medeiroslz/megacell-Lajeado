import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Clock, FileText, Globe, Laptop,
  Megaphone, MousePointerClick, PackageSearch, RefreshCw, Share2, Smartphone, TrendingDown, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

type Kpis = { visitors: number; pageviews: number; sessions: number; bounce_rate: number; avg_duration: number };
type Point = Kpis & { t: string };
type Row = { label: string; value: number; source?: string };
type Report = {
  hourly: boolean; current: Kpis; previous: Kpis; series: Point[]; pages: Row[]; top_products: Row[];
  referrers: Row[]; utm: Row[]; countries: Row[]; devices: Row[]; browsers: Row[]; os: Row[]; online: number;
};
type RangeKey = "today" | "24h" | "7d" | "30d" | "90d" | "custom";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Hoje" }, { key: "24h", label: "24h" }, { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" }, { key: "90d", label: "90 dias" }, { key: "custom", label: "Personalizado" },
];
const DEVICE_LABEL: Record<string, string> = { desktop: "Computador", mobile: "Celular", tablet: "Tablet" };
const CHART_COLORS = ["var(--primary)", "var(--brand)", "var(--cherry)", "var(--muted-foreground)"];

function computeRange(key: RangeKey, from: string, to: string): [Date, Date] {
  const now = new Date();
  if (key === "today") { const start = new Date(now); start.setHours(0, 0, 0, 0); return [start, now]; }
  if (key === "custom" && from && to) return [new Date(`${from}T00:00:00`), new Date(`${to}T23:59:59`)];
  const hours = key === "24h" ? 24 : key === "7d" ? 168 : key === "30d" ? 720 : key === "90d" ? 2160 : 168;
  return [new Date(now.getTime() - hours * 3_600_000), now];
}

const fmtInt = (value: number) => Math.round(value).toLocaleString("pt-BR");
function fmtDuration(value: number) {
  const seconds = Math.round(value);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}
function fmtBucket(value: string, hourly: boolean, long = false) {
  const [date, hour] = value.split("T");
  const [, month, day] = (date ?? "").split("-");
  return hourly ? (long ? `${day}/${month} às ${hour}` : (hour ?? "")) : `${day}/${month}`;
}
function countryLabel(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return "🌐 Desconhecido";
  const flag = String.fromCodePoint(...[...code].map((letter) => 0x1f1a5 + letter.charCodeAt(0)));
  try { return `${flag} ${new Intl.DisplayNames(["pt-BR"], { type: "region" }).of(code) ?? code}`; }
  catch { return `${flag} ${code}`; }
}

function useCountUp(value: number) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);
  useEffect(() => {
    const from = previous.current; const started = performance.now(); let frame = 0;
    const step = (time: number) => {
      const progress = Math.min(1, (time - started) / 600);
      setDisplay(from + (value - from) * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(step); else previous.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return display;
}

function Delta({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  if (!previous && !current) return <span className="text-xs text-muted-foreground">—</span>;
  if (!previous) return <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">novo</span>;
  const percent = ((current - previous) / previous) * 100;
  const up = percent >= 0; const good = invert ? !up : up; const Icon = up ? ArrowUpRight : ArrowDownRight;
  return <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${good ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
    <Icon className="h-3 w-3" />{Math.abs(percent).toFixed(1)}%
  </span>;
}

function Sparkline({ data, field }: { data: Point[]; field: keyof Kpis }) {
  return <div className="h-10 w-full"><ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
      <Area type="monotone" dataKey={field} stroke="var(--primary)" strokeWidth={1.5} fill="var(--primary)" fillOpacity={0.12} isAnimationActive={false} />
    </AreaChart>
  </ResponsiveContainer></div>;
}

function KpiCard({ label, icon, value, previous, format, series, field, invert, delay }: {
  label: string; icon: ReactNode; value: number; previous: number; format: (value: number) => string;
  series: Point[]; field: keyof Kpis; invert?: boolean; delay: string;
}) {
  const animated = useCountUp(value);
  return <div className={`surface-card analytics-in p-4 ${delay}`}>
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">{icon}{label}</span>
      <Delta current={value} previous={previous} invert={invert} />
    </div>
    <div className="mt-2 text-3xl font-semibold tabular-nums">{format(animated)}</div>
    <div className="mt-2"><Sparkline data={series} field={field} /></div>
  </div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
    <div className="rounded-full border border-border bg-muted p-3"><BarChart3 className="h-5 w-5 text-muted-foreground" /></div>
    <p className="text-sm text-muted-foreground">{text}</p>
  </div>;
}

function ListCard({ title, icon, rows, render, empty = "Sem dados no período" }: {
  title: string; icon: ReactNode; rows: Row[]; render?: (row: Row) => ReactNode; empty?: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  return <div className="surface-card analytics-in p-5">
    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><span className="text-primary">{icon}</span>{title}</h3>
    {rows.length === 0 ? <EmptyState text={empty} /> : <ul className="space-y-2.5">{rows.map((row) => (
      <li key={`${title}-${row.label}`} className="relative overflow-hidden rounded-md">
        <div className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${(row.value / max) * 100}%` }} />
        <div className="relative flex items-center justify-between gap-3 px-2.5 py-1.5 text-sm">
          <span className="min-w-0 truncate">{render ? render(row) : row.label}</span>
          <span className="flex shrink-0 items-baseline gap-2 tabular-nums"><strong>{fmtInt(row.value)}</strong><small className="w-9 text-right text-muted-foreground">{((row.value / total) * 100).toFixed(0)}%</small></span>
        </div>
      </li>
    ))}</ul>}
  </div>;
}

function DevicesCard({ rows }: { rows: Row[] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return <div className="surface-card analytics-in p-5">
    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold"><Smartphone className="h-4 w-4 text-primary" />Dispositivos</h3>
    {rows.length === 0 ? <EmptyState text="Sem dados no período" /> : <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={rows} dataKey="value" nameKey="label" innerRadius={48} outerRadius={70} paddingAngle={3} stroke="none">{rows.map((row, index) => <Cell key={row.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-xl">{fmtInt(total)}</strong><span className="text-[10px] uppercase text-muted-foreground">sessões</span></div>
      </div>
      <ul className="w-full space-y-2">{rows.map((row, index) => <li key={row.label} className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-primary" : index === 1 ? "bg-brand" : index === 2 ? "bg-cherry" : "bg-muted-foreground"}`} />{DEVICE_LABEL[row.label] ?? row.label}</span>
        <span className="tabular-nums text-muted-foreground"><strong className="text-foreground">{fmtInt(row.value)}</strong> · {total ? ((row.value / total) * 100).toFixed(0) : 0}%</span>
      </li>)}</ul>
    </div>}
  </div>;
}

function LoadingState() {
  return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-36 rounded-lg" />)}</div><Skeleton className="h-80 rounded-lg" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-64 rounded-lg" /><Skeleton className="h-64 rounded-lg" /></div></div>;
}

export function AnalyticsManager() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [customFrom, setCustomFrom] = useState(""); const [customTo, setCustomTo] = useState("");
  const [report, setReport] = useState<Report | null>(null); const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); const [error, setError] = useState(false);
  const [metric, setMetric] = useState<"visitors" | "pageviews">("visitors");

  const load = useCallback(async (silent = false) => {
    if (range === "custom" && (!customFrom || !customTo)) return;
    silent ? setRefreshing(true) : setLoading(true);
    const [from, to] = computeRange(range, customFrom, customTo);
    const { data, error: loadError } = await supabase.rpc("analytics_report", { p_from: from.toISOString(), p_to: to.toISOString() });
    if (loadError) setError(true); else { setError(false); setReport(data as unknown as Report); }
    setLoading(false); setRefreshing(false);
  }, [range, customFrom, customTo]);

  useEffect(() => { void load(); const interval = window.setInterval(() => void load(true), 60_000); return () => window.clearInterval(interval); }, [load]);
  const series = report?.series ?? [];
  const hasData = useMemo(() => Boolean(report && (report.current.pageviews || report.current.sessions)), [report]);

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><h2 className="text-2xl font-semibold">Analytics</h2><div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" /></span><span><strong className="text-foreground">{fmtInt(report?.online ?? 0)}</strong> online agora</span></div></div>
      <div className="flex flex-wrap items-center gap-2"><div className="flex flex-wrap gap-1 rounded-md border border-border bg-card p-1">{RANGES.map((item) => <Button key={item.key} type="button" size="sm" variant={range === item.key ? "default" : "ghost"} onClick={() => setRange(item.key)}>{item.label}</Button>)}</div><Button type="button" size="icon" variant="outline" aria-label="Atualizar Analytics" title="Atualizar" onClick={() => void load(true)} disabled={refreshing}><RefreshCw className={refreshing ? "animate-spin" : ""} /></Button></div>
    </div>

    {range === "custom" ? <div className="flex flex-wrap items-center gap-2"><Input aria-label="Data inicial" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} className="w-auto" /><span className="text-sm text-muted-foreground">até</span><Input aria-label="Data final" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="w-auto" />{!customFrom || !customTo ? <span className="text-xs text-muted-foreground">Escolha as duas datas</span> : null}</div> : null}

    {loading && !report ? <LoadingState /> : error && !report ? <div className="surface-card p-8"><EmptyState text="Não foi possível carregar os dados. Tente atualizar." /></div> : report ? <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Visitantes" icon={<Users className="h-3.5 w-3.5" />} value={report.current.visitors} previous={report.previous.visitors} format={fmtInt} series={series} field="visitors" delay="[animation-delay:0ms]" />
        <KpiCard label="Visualizações" icon={<FileText className="h-3.5 w-3.5" />} value={report.current.pageviews} previous={report.previous.pageviews} format={fmtInt} series={series} field="pageviews" delay="[animation-delay:50ms]" />
        <KpiCard label="Sessões" icon={<MousePointerClick className="h-3.5 w-3.5" />} value={report.current.sessions} previous={report.previous.sessions} format={fmtInt} series={series} field="sessions" delay="[animation-delay:100ms]" />
        <KpiCard label="Taxa de rejeição" icon={<TrendingDown className="h-3.5 w-3.5" />} value={report.current.bounce_rate} previous={report.previous.bounce_rate} format={(value) => `${value.toFixed(1)}%`} series={series} field="bounce_rate" invert delay="[animation-delay:150ms]" />
        <KpiCard label="Duração média" icon={<Clock className="h-3.5 w-3.5" />} value={report.current.avg_duration} previous={report.previous.avg_duration} format={fmtDuration} series={series} field="avg_duration" delay="[animation-delay:200ms]" />
      </div>

      <div className="surface-card analytics-in p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-primary" />{report.hourly ? "Acessos por hora" : "Acessos por dia"}</h3><div className="flex gap-1 rounded-md border border-border p-1"><Button type="button" size="sm" variant={metric === "visitors" ? "secondary" : "ghost"} onClick={() => setMetric("visitors")}>Visitantes</Button><Button type="button" size="sm" variant={metric === "pageviews" ? "secondary" : "ghost"} onClick={() => setMetric("pageviews")}>Visualizações</Button></div></div>
        {hasData ? <div className="h-72"><ResponsiveContainer width="100%" height="100%"><AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="t" tickFormatter={(value: string) => fmtBucket(value, report.hourly)} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} minTickGap={24} /><YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} /><Tooltip labelFormatter={(value) => fmtBucket(String(value), report.hourly, true)} formatter={(value) => [fmtInt(Number(value)), metric === "visitors" ? "Visitantes" : "Visualizações"]} /><Area type="monotone" dataKey={metric} stroke="var(--primary)" strokeWidth={2} fill="var(--primary)" fillOpacity={0.14} /></AreaChart></ResponsiveContainer></div> : <EmptyState text="Ainda não há visitas neste período." />}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard title="Top páginas" icon={<FileText className="h-4 w-4" />} rows={report.pages} />
        <ListCard title="Top produtos" icon={<PackageSearch className="h-4 w-4" />} rows={report.top_products} />
        <ListCard title="Origens de tráfego" icon={<Share2 className="h-4 w-4" />} rows={report.referrers} />
        <ListCard title="Países" icon={<Globe className="h-4 w-4" />} rows={report.countries} render={(row) => countryLabel(row.label)} />
        <DevicesCard rows={report.devices} />
        <ListCard title="Navegadores" icon={<Laptop className="h-4 w-4" />} rows={report.browsers} />
        <ListCard title="Sistemas operacionais" icon={<Laptop className="h-4 w-4" />} rows={report.os} />
        <ListCard title="Campanhas UTM" icon={<Megaphone className="h-4 w-4" />} rows={report.utm} empty="Nenhuma campanha identificada no período" render={(row) => <span>{row.label}{row.source ? <small className="ml-2 text-muted-foreground">{row.source}</small> : null}</span>} />
      </div>
    </> : null}
  </div>;
}
