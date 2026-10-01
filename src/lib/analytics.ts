import { supabase } from "@/integrations/supabase/client";

const getDevice = () => {
  const w = window.innerWidth;
  return w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop";
};

// Call only from useEffect / event handlers (browser only).
export function trackView(extra?: { product_id?: string; product_name?: string }) {
  try {
    if (typeof window === "undefined") return;
    if (location.pathname.startsWith("/admin")) return;
    let sid = sessionStorage.getItem("sid");
    if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem("sid", sid); }
    void supabase.from("page_views").insert({
      path: location.pathname,
      device: getDevice(),
      referrer: document.referrer || null,
      session_id: sid,
      ...extra,
    }).then(() => {});
  } catch { /* never break the page */ }
}
