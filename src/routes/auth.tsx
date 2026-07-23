import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({ mode: z.enum(["login", "register"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Entrar | Premia Brasas" },
      { name: "description", content: "Acesse o Premia Brasas — sistema de avaliação de técnicos da Brasas Extintores." },
    ],
  }),
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"login" | "register">(search.mode ?? "login");
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        if (fullName.trim().length < 3) throw new Error("Informe seu nome completo.");
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        toast.success("Cadastro criado! Acesso liberado.");
        await supabase.auth.signInWithPassword({ email: email.trim(), password });
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div
        className="relative hidden md:flex flex-col justify-between p-12 text-primary-foreground"
        style={{ background: "var(--gradient-brasas)" }}
      >
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/15 backdrop-blur">
            <Flame className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-xl font-black tracking-tight">PREMIA BRASAS</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest opacity-80">
              Avaliação de Técnicos
            </div>
          </div>
        </Link>
        <div>
          <h2 className="text-5xl font-black leading-tight">
            Bem-vindo ao<br /> Premia Brasas.
          </h2>
          <p className="mt-4 max-w-md text-lg opacity-90">
            Excelência em prevenção e combate a incêndios começa com técnicos
            reconhecidos pelo seu desempenho.
          </p>
        </div>
        <div className="text-xs opacity-70">© Brasas Extintores</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 md:hidden flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Flame className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="text-xl font-black tracking-tight">
              PREMIA <span className="text-primary">BRASAS</span>
            </div>
          </div>

          <div className="mb-6 flex rounded-lg bg-secondary p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-2 text-sm font-bold transition ${
                mode === "login"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-md py-2 text-sm font-bold transition ${
                mode === "register"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground"
              }`}
            >
              Cadastrar
            </button>
          </div>

          <h1 className="text-3xl font-black tracking-tight">
            {mode === "login" ? "Acessar sistema" : "Criar cadastro"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Use seu e-mail e senha de acesso."
              : "Preencha seus dados para acessar o sistema."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-sm font-semibold">Nome completo</label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Ex: João da Silva"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-semibold">E-mail</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="voce@empresa.com.br"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Senha</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-brasas)] transition hover:brightness-110 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Criar cadastro"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">← Voltar para o início</Link>
          </p>
        </div>
      </div>
    </div>
  );
}