import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BOT_RE = /bot|crawl|spider|slurp|bing|facebookexternalhit|preview|headless|lighthouse|pingdom|curl|wget|python|axios|node-fetch|monitor/i;

const schema = z.object({
  type: z.enum(["pageview", "heartbeat"]),
  visitor_id: z.string().uuid(),
  session_id: z.string().uuid(),
  path: z.string().max(500).default("/"),
  title: z.string().max(300).default(""),
  referrer: z.string().max(1000).default(""),
  utm_source: z.string().max(200).default(""),
  utm_medium: z.string().max(200).default(""),
  utm_campaign: z.string().max(200).default(""),
  product_id: z.string().uuid().optional(),
  product_name: z.string().max(300).optional(),
});

function parseUserAgent(userAgent: string) {
  const device = /ipad|tablet|kindle|silk/i.test(userAgent) || (/android/i.test(userAgent) && !/mobile/i.test(userAgent))
    ? "tablet" : /mobi|iphone|ipod|android/i.test(userAgent) ? "mobile" : "desktop";
  const browser = /edg\//i.test(userAgent) ? "Edge" : /opr\/|opera/i.test(userAgent) ? "Opera"
    : /samsungbrowser/i.test(userAgent) ? "Samsung Internet" : /instagram/i.test(userAgent) ? "Instagram"
      : /fban|fbav/i.test(userAgent) ? "Facebook" : /crios|chrome/i.test(userAgent) ? "Chrome"
        : /fxios|firefox/i.test(userAgent) ? "Firefox" : /safari/i.test(userAgent) ? "Safari" : "Outro";
  const os = /iphone|ipad|ipod/i.test(userAgent) ? "iOS" : /android/i.test(userAgent) ? "Android"
    : /windows/i.test(userAgent) ? "Windows" : /mac os/i.test(userAgent) ? "macOS"
      : /linux/i.test(userAgent) ? "Linux" : "Outro";
  return { device, browser, os };
}

function referrerDomain(referrer: string, host: string) {
  try {
    const domain = new URL(referrer).hostname.replace(/^www\./, "");
    return !domain || domain === host.replace(/^www\./, "") ? "" : domain;
  } catch {
    return "";
  }
}

export const Route = createFileRoute("/api/public/track")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userAgent = request.headers.get("user-agent") ?? "";
        if (!userAgent || BOT_RE.test(userAgent)) return new Response(null, { status: 204 });

        let body: unknown;
        try { body = JSON.parse(await request.text()); }
        catch { return new Response("bad request", { status: 400 }); }
        const parsed = schema.safeParse(body);
        if (!parsed.success) return new Response("bad request", { status: 400 });
        const payload = parsed.data;
        if (payload.path.startsWith("/admin") || payload.path.startsWith("/api")) return new Response(null, { status: 204 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = new Date();
        const { data: session } = await supabaseAdmin.from("analytics_sessions")
          .select("id, started_at, pageviews_count, visitor_id")
          .eq("id", payload.session_id).maybeSingle();
        if (session && session.visitor_id !== payload.visitor_id) return new Response(null, { status: 204 });

        if (payload.type === "heartbeat") {
          if (session) {
            const duration = Math.max(0, Math.round((now.getTime() - new Date(session.started_at).getTime()) / 1000));
            await supabaseAdmin.from("analytics_sessions").update({ last_seen_at: now.toISOString(), duration_seconds: duration }).eq("id", payload.session_id);
          }
          return new Response(null, { status: 204 });
        }

        if (!session) {
          const { device, browser, os } = parseUserAgent(userAgent);
          const countryCode = (request.headers.get("cf-ipcountry") ?? "").toUpperCase().slice(0, 2);
          await supabaseAdmin.from("analytics_sessions").insert({
            id: payload.session_id, visitor_id: payload.visitor_id, started_at: now.toISOString(), last_seen_at: now.toISOString(),
            entry_path: payload.path, referrer: payload.referrer,
            referrer_domain: referrerDomain(payload.referrer, new URL(request.url).hostname),
            utm_source: payload.utm_source, utm_medium: payload.utm_medium, utm_campaign: payload.utm_campaign,
            country: countryCode === "XX" || countryCode === "T1" ? "" : countryCode,
            device_type: device, browser, os, pageviews_count: 1, is_bounce: true,
          });
        } else {
          const count = session.pageviews_count + 1;
          const duration = Math.max(0, Math.round((now.getTime() - new Date(session.started_at).getTime()) / 1000));
          await supabaseAdmin.from("analytics_sessions").update({ pageviews_count: count, is_bounce: count <= 1, last_seen_at: now.toISOString(), duration_seconds: duration }).eq("id", payload.session_id);
        }

        await supabaseAdmin.from("analytics_events").insert({
          session_id: payload.session_id, visitor_id: payload.visitor_id, event_type: "pageview",
          path: payload.path, title: payload.title, product_id: payload.product_id ?? null, product_name: payload.product_name ?? null,
        });
        return new Response(null, { status: 204 });
      },
    },
  },
});