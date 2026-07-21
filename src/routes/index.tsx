import { createFileRoute, Link } from "@tanstack/react-router";
import mascot from "@/assets/extintor-mascot.png";
import { Flame, ShieldCheck, TrendingUp, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Premia Brasas — Avaliação de Técnicos Brasas Extintores" },
      {
        name: "description",
        content:
          "Sistema Premia Brasas: acompanhe produtividade, qualidade, segurança e comportamento dos técnicos da Brasas Extintores.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/95 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[var(--shadow-brasas)]">
              <Flame className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="text-xl font-black tracking-tight">
                PREMIA <span className="text-primary">BRASAS</span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Avaliação de Técnicos
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              to="/auth"
              className="rounded-md px-4 py-2 text-sm font-semibold text-foreground/80 hover:text-foreground"
            >
              Entrar
            </Link>
            <Link
              to="/auth"
              search={{ mode: "register" as const }}
              className="rounded-md bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-[var(--shadow-brasas)] transition hover:brightness-110"
            >
              Cadastrar
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-1/2"
          style={{ background: "var(--gradient-brasas)" }}
        />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
              <Flame className="h-3.5 w-3.5" /> Brasas Extintores
            </span>
            <h1 className="mt-4 text-5xl font-black leading-[1.05] tracking-tight md:text-6xl">
              Reconhecendo os{" "}
              <span className="text-primary">melhores técnicos</span>
              <br /> da linha de frente.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              O <strong>Premia Brasas</strong> é o sistema oficial de avaliação
              de desempenho: produtividade, qualidade, segurança e comportamento
              — tudo em um só lugar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ mode: "register" as const }}
                className="rounded-md bg-primary px-7 py-3 text-base font-bold text-primary-foreground shadow-[var(--shadow-brasas)] transition hover:brightness-110"
              >
                Criar meu cadastro
              </Link>
              <Link
                to="/auth"
                className="rounded-md border-2 border-foreground/20 px-7 py-3 text-base font-bold hover:border-foreground/40"
              >
                Já tenho acesso
              </Link>
            </div>
          </div>
          <div className="relative flex justify-center md:justify-end">
            <img
              src={mascot}
              alt="Mascote extintor Brasas"
              className="relative z-10 h-[420px] w-auto drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-center text-3xl font-black tracking-tight md:text-4xl">
          O que é avaliado
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Quatro pilares que definem a excelência dos técnicos Brasas.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: TrendingUp, title: "Produtividade", desc: "Cumprimento de prazos, agilidade, diagnóstico e resolução." },
            { icon: ShieldCheck, title: "Qualidade", desc: "Retrabalho, checklist, inspeções e qualidade dos serviços." },
            { icon: Flame, title: "Segurança", desc: "Uso de EPI, zelo pelos equipamentos e organização do estoque." },
            { icon: Users, title: "Comportamento", desc: "Respeito à liderança, trabalho em equipe e proatividade." },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card p-6 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-brasas)]"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" strokeWidth={2.5} />
              </div>
              <div className="text-lg font-extrabold">{f.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-secondary/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-muted-foreground md:flex-row">
          <div>© {new Date().getFullYear()} Brasas Extintores — Premia Brasas</div>
          <div>Sistema interno de avaliação de desempenho</div>
        </div>
      </footer>
    </div>
  );
}
