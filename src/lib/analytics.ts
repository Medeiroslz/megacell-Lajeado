import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY = "megacell_vid";
const SESSION_KEY = "megacell_session";
const SESSION_TTL = 30 * 60 * 1000;
type StoredSession = { id: string; touchedAt: number };

function getIds() {
  let visitorId = localStorage.getItem(VISITOR_KEY);
  if (!visitorId) { visitorId = crypto.randomUUID(); localStorage.setItem(VISITOR_KEY, visitorId); }
  let session: StoredSession | null = null;
  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as StoredSession | null; } catch { session = null; }
  const isNew = !session || Date.now() - session.touchedAt >= SESSION_TTL;
  const sessionId = !isNew && session ? session.id : crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id: sessionId, touchedAt: Date.now() }));
  return { visitorId, sessionId, isNew };
}

function send(payload: Record<string, unknown>) {
  void fetch("/api/public/track", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), keepalive: true,
  }).catch(() => undefined);
}

async function isAdminSession() {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function trackView(extra?: { product_id?: string; product_name?: string }) {
  try {
    if (typeof window === "undefined" || location.pathname.startsWith("/admin") || await isAdminSession()) return;
    const { visitorId, sessionId, isNew } = getIds();
    const params = new URLSearchParams(location.search);
    send({
      type: "pageview", visitor_id: visitorId, session_id: sessionId, path: location.pathname,
      title: document.title.slice(0, 300), referrer: isNew ? document.referrer.slice(0, 1000) : "",
      utm_source: params.get("utm_source") ?? "", utm_medium: params.get("utm_medium") ?? "",
      utm_campaign: params.get("utm_campaign") ?? "", ...extra,
    });
  } catch { /* Analytics must never interrupt shopping. */ }
}

export function startAnalyticsHeartbeat() {
  if (typeof window === "undefined" || location.pathname.startsWith("/admin")) return () => undefined;
  const interval = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    void (async () => {
      if (await isAdminSession()) return;
      const { visitorId, sessionId, isNew } = getIds();
      if (!isNew) send({ type: "heartbeat", visitor_id: visitorId, session_id: sessionId, path: location.pathname });
    })();
  }, 15_000);
  return () => window.clearInterval(interval);
}
