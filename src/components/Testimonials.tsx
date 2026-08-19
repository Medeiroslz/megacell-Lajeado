import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { depoimentoImageUrl } from "@/lib/depoimento-images";
import type { Depoimento } from "@/lib/catalog-types";

async function fetchDepoimentos(): Promise<Depoimento[]> {
  const { data, error } = await supabase
    .from("depoimentos")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Depoimento[];
}

export function Testimonials() {
  const q = useQuery({ queryKey: ["depoimentos", "public"], queryFn: fetchDepoimentos });
  const items = q.data ?? [];

  return (
    <section className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">O que dizem nossos clientes</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Prints reais de avaliações e conversas de quem já comprou na Mega Cell.
          </p>
        </div>

        {items.length > 0 ? (
          <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
            {items.map((d) => (
              <figure key={d.id} className="print-card break-inside-avoid">
                <img
                  src={depoimentoImageUrl(d.image_path)}
                  alt={d.alt_text || "Avaliação de cliente da Mega Cell"}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full"
                />
              </figure>
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-8 max-w-md">
            <div className="print-card p-8 text-center">
              <div className="flex items-center justify-center gap-1 text-brand">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <div className="mt-3 text-3xl font-semibold">5.0 ★</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Avaliações reais de clientes serão publicadas aqui em breve.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
