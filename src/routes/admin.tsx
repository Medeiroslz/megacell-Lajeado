import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — HelpCell" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) { setIsAdmin(null); setLoading(false); }
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (!data.session?.user) setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => { setIsAdmin(!!data); setLoading(false); });
  }, [user]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Carregando…</div>;
  }
  if (!user) return <LoginForm />;
  if (!isAdmin) return <NotAuthorized />;
  return <AdminDashboard user={user} />;
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <form onSubmit={submit} className="surface-card w-full max-w-sm p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-foreground font-bold">H</span>
          <span className="font-semibold">HelpCell — Admin</span>
        </div>
        <h1 className="mb-1 text-xl font-semibold">Entrar no painel</h1>
        <p className="mb-6 text-sm text-muted-foreground">Acesso restrito.</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-surface" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-surface" />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
            {busy ? "Entrando…" : "Entrar"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function NotAuthorized() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="surface-card max-w-md p-8 text-center">
        <h1 className="text-lg font-semibold">Acesso negado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sua conta não tem permissão de administrador. Solicite acesso ao responsável.
        </p>
        <Button onClick={() => supabase.auth.signOut()} variant="outline" className="mt-6">Sair</Button>
      </div>
    </div>
  );
}
