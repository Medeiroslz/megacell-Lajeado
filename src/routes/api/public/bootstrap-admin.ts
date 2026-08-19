import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("x-setup-secret") !== process.env["LOVABLE_CRON_SECRET"]) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: "romulo@megacell.com",
          password: "Romulo2026",
          email_confirm: true,
        });
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        const userId = data.user!.id;
        const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
        if (roleErr) return new Response(JSON.stringify({ error: roleErr.message }), { status: 500 });
        return new Response(JSON.stringify({ ok: true, userId }));
      },
    },
  },
});
