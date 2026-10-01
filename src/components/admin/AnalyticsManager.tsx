import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar,
} from "recharts";

interface Summary {
  cards: Record<string, number>;
  daily: { day: string; views: number; visitors: number }[];
  devices: { device: string; views: number }[];
  top_products: { name: string; views: number }[];
}

const PERIODS = [7, 30, 90];
const COLORS = ["var(--primary)", "var(--brand)", "var(--muted-foreground)", "var(--preorder, #442C43)"];

export function AnalyticsManager() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null); setError(null);
    supabase.rpc("analytics_summary", { _days: days }).then(({ data, error }) => {
      if (error) setError(error.message); else setData(data as unknown as Summary);
    });
  }, [days]);

  const c = data?.cards ?? {};
  const cards = [
    ["Hoje", c.today_visitors, c.today_views],
    ["7 dias", c.d7_visitors, c.d7_views],
    ["30 dias", c.d30_visitors, c.d30_views],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(([label, vis, views]) => (
          <div key={label} className="surface-card p-5">
            <div className="text-xs uppercase text-muted-foreground">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{vis ?? "—"} <span className="text-sm font-normal text-muted-foreground">visitantes</span></div>
            <div className="text-sm text-muted-foreground">{views ?? "—"} visualizações</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Período:</span>
        {PERIODS.map((p) => (
          <button key={p} onClick={() => setDays(p)}
            className={`rounded-md border px-3 py-1 text-sm ${days === p ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
            {p} dias
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {!data && !error && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {data && (
        <>
          <div className="surface-card p-5">
            <h3 className="mb-4 font-semibold">Acessos por dia</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="views" name="Visualizações" stroke="var(--primary)" strokeWidth={2} />
                  <Line type="monotone" dataKey="visitors" name="Visitantes" stroke="var(--brand)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="surface-card p-5">
              <h3 className="mb-4 font-semibold">Dispositivos</h3>
              <div className="h-64">
                {data.devices.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados ainda.</p> : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={data.devices} dataKey="views" nameKey="device" outerRadius={80} label>
                        {data.devices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Legend /><Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="surface-card p-5">
              <h3 className="mb-4 font-semibold">Top 10 produtos mais vistos</h3>
              <div className="h-64">
                {data.top_products.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados ainda.</p> : (
                  <ResponsiveContainer>
                    <BarChart data={data.top_products} layout="vertical" margin={{ left: 20 }}>
                      <XAxis type="number" allowDecimals={false} fontSize={12} />
                      <YAxis type="category" dataKey="name" width={120} fontSize={11} />
                      <Tooltip />
                      <Bar dataKey="views" name="Visualizações" fill="var(--primary)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
