import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getMe,
  listProfiles,
  setProfileStatus,
  listTechnicians,
  addTechnician,
  listEvaluations,
  createEvaluation,
  deleteEvaluation,
} from "@/lib/premia.functions";
import { Flame, LogOut, Clock, CheckCircle2, XCircle, Trash2, Plus, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Painel | Premia Brasas" },
      { name: "description", content: "Painel de avaliação de técnicos Brasas Extintores." },
    ],
  }),
});

type Tab = "painel" | "avaliar" | "tecnicos" | "aprovar";

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const meFn = useServerFn(getMe);
  const me = useQuery({ queryKey: ["me"], queryFn: () => meFn() });

  const [tab, setTab] = useState<Tab>("painel");

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (me.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!me.data?.isApproved) {
    return <PendingScreen name={me.data?.profile?.full_name ?? ""} onSignOut={signOut} status={me.data?.profile?.status ?? "pending"} />;
  }

  const isAdmin = !!me.data?.isAdmin;

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-[var(--shadow-brasas)]">
              <Flame className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-black tracking-tight">
                PREMIA <span className="text-primary">BRASAS</span>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {isAdmin ? "Operador Master" : "Técnico"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-bold">{me.data?.profile?.full_name}</div>
              <div className="text-xs text-muted-foreground">{me.data?.profile?.email}</div>
            </div>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-secondary"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-6">
          {(
            [
              { k: "painel", label: "Painel de Análise" },
              ...(isAdmin
                ? ([
                    { k: "avaliar", label: "Nova Avaliação" },
                    { k: "tecnicos", label: "Técnicos" },
                    { k: "aprovar", label: "Aprovações" },
                  ] as const)
                : []),
            ] as { k: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`relative whitespace-nowrap px-4 py-3 text-sm font-bold transition ${
                tab === t.k
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {tab === t.k && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {isAdmin && <PendingBanner onOpenTab={() => setTab("aprovar")} />}
        {tab === "painel" && <PainelTab />}
        {tab === "avaliar" && isAdmin && <AvaliarTab />}
        {tab === "tecnicos" && isAdmin && <TecnicosTab />}
        {tab === "aprovar" && isAdmin && <AprovacoesTab />}
      </main>
    </div>
  );
}

function PendingScreen({ name, onSignOut, status }: { name: string; onSignOut: () => void; status: string }) {
  const rejected = status === "rejected";
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-lg">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${rejected ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          {rejected ? <XCircle className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
        </div>
        <h1 className="mt-5 text-2xl font-black">
          {rejected ? "Cadastro não aprovado" : "Aguardando aprovação"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {rejected
            ? `${name}, seu acesso não foi liberado. Fale com o operador master.`
            : `Olá, ${name}! Seu cadastro foi enviado ao operador master. Assim que aprovado, você poderá acessar o Premia Brasas.`}
        </p>
        <button
          onClick={onSignOut}
          className="mt-6 inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </div>
  );
}

// ---------- Painel ----------

const num = (v: unknown) => (v == null || v === "" ? null : Number(v));
const avg = (arr: (number | null)[]) => {
  const vals = arr.filter((v): v is number => v != null && !Number.isNaN(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};
const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(2));

function PainelTab() {
  const evalFn = useServerFn(listEvaluations);
  const techFn = useServerFn(listTechnicians);
  const evals = useQuery({ queryKey: ["evaluations"], queryFn: () => evalFn() });
  const techs = useQuery({ queryKey: ["technicians"], queryFn: () => techFn() });

  const rows = useMemo(() => {
    if (!evals.data || !techs.data) return [];
    return techs.data
      .filter((t) => t.active)
      .map((t) => {
        const items = evals.data.filter((e: any) => e.technician_id === t.id);
        const prod = avg(
          items.flatMap((e: any) => [
            num(e.prod_cumprimento_prazo),
            num(e.prod_agilidade),
            num(e.prod_diagnostico),
            num(e.prod_resolucao),
          ]),
        );
        const qual = avg(
          items.flatMap((e: any) => [
            num(e.qual_retrabalho),
            num(e.qual_checklist),
            num(e.qual_inspecoes),
            num(e.qual_qualidade_servico),
          ]),
        );
        const seg = avg(
          items.flatMap((e: any) => [num(e.seg_epi), num(e.seg_zelo), num(e.seg_organizacao)]),
        );
        const comp = avg(
          items.flatMap((e: any) => [
            num(e.comp_lideranca),
            num(e.comp_equipe),
            num(e.comp_proatividade),
          ]),
        );
        const final = avg([prod, qual, seg, comp]);
        return { technician: t, count: items.length, prod, qual, seg, comp, final };
      })
      .sort((a, b) => (b.final ?? -1) - (a.final ?? -1));
  }, [evals.data, techs.data]);

  if (evals.isLoading || techs.isLoading) {
    return <div className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Painel de Análise</h2>
        <p className="text-sm text-muted-foreground">
          Médias consolidadas das avaliações registradas por técnico.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-left">
              <th className="px-4 py-3 font-bold">#</th>
              <th className="px-4 py-3 font-bold">Técnico</th>
              <th className="px-4 py-3 text-center font-bold">Avaliações</th>
              <th className="px-4 py-3 text-center font-bold">Produtividade</th>
              <th className="px-4 py-3 text-center font-bold">Qualidade</th>
              <th className="px-4 py-3 text-center font-bold">Organ. & Seg.</th>
              <th className="px-4 py-3 text-center font-bold">Comportamento</th>
              <th className="px-4 py-3 text-center font-bold">Média Final</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.technician.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-bold text-muted-foreground">
                  {i === 0 && r.final != null ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Trophy className="h-4 w-4" /> 1
                    </span>
                  ) : (
                    i + 1
                  )}
                </td>
                <td className="px-4 py-3 font-bold">{r.technician.name}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">{r.count}</td>
                <td className="px-4 py-3 text-center font-mono">{fmt(r.prod)}</td>
                <td className="px-4 py-3 text-center font-mono">{fmt(r.qual)}</td>
                <td className="px-4 py-3 text-center font-mono">{fmt(r.seg)}</td>
                <td className="px-4 py-3 text-center font-mono">{fmt(r.comp)}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex min-w-[3.5rem] justify-center rounded-md px-2 py-1 font-mono text-sm font-bold ${
                      r.final == null
                        ? "bg-muted text-muted-foreground"
                        : r.final >= 8
                        ? "bg-primary/10 text-primary"
                        : r.final >= 5
                        ? "bg-accent text-accent-foreground"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {fmt(r.final)}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  Nenhum técnico cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="mb-3 text-lg font-black">Últimas avaliações</h3>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/60 text-left">
                <th className="px-4 py-3 font-bold">Data</th>
                <th className="px-4 py-3 font-bold">Técnico</th>
                <th className="px-4 py-3 font-bold">OS</th>
                <th className="px-4 py-3 font-bold">Serviço</th>
                <th className="px-4 py-3 text-center font-bold">Prod.</th>
                <th className="px-4 py-3 text-center font-bold">Qual.</th>
                <th className="px-4 py-3 text-center font-bold">Seg.</th>
                <th className="px-4 py-3 text-center font-bold">Comp.</th>
              </tr>
            </thead>
            <tbody>
              {(evals.data ?? []).slice(0, 15).map((e: any) => {
                const p = avg([e.prod_cumprimento_prazo, e.prod_agilidade, e.prod_diagnostico, e.prod_resolucao].map(num));
                const q = avg([e.qual_retrabalho, e.qual_checklist, e.qual_inspecoes, e.qual_qualidade_servico].map(num));
                const s = avg([e.seg_epi, e.seg_zelo, e.seg_organizacao].map(num));
                const c = avg([e.comp_lideranca, e.comp_equipe, e.comp_proatividade].map(num));
                return (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">{new Date(e.eval_date).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-2.5 font-semibold">{e.technician?.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.os_number ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.service_type ?? "—"}</td>
                    <td className="px-4 py-2.5 text-center font-mono">{fmt(p)}</td>
                    <td className="px-4 py-2.5 text-center font-mono">{fmt(q)}</td>
                    <td className="px-4 py-2.5 text-center font-mono">{fmt(s)}</td>
                    <td className="px-4 py-2.5 text-center font-mono">{fmt(c)}</td>
                  </tr>
                );
              })}
              {(evals.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhuma avaliação registrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------- Avaliar ----------

type FormNumbers = Record<string, string>;
const numFields: { key: string; label: string; group: string }[] = [
  { group: "Produtividade", key: "prod_cumprimento_prazo", label: "Cumprimento de Prazo" },
  { group: "Produtividade", key: "prod_agilidade", label: "Agilidade Operacional" },
  { group: "Produtividade", key: "prod_diagnostico", label: "Diagnóstico de Problemas" },
  { group: "Produtividade", key: "prod_resolucao", label: "Resolução de Problemas" },
  { group: "Qualidade", key: "qual_retrabalho", label: "Redução de Retrabalho" },
  { group: "Qualidade", key: "qual_checklist", label: "Checklist Preenchido" },
  { group: "Qualidade", key: "qual_inspecoes", label: "Inspeções Corretas" },
  { group: "Qualidade", key: "qual_qualidade_servico", label: "Qualidade dos Serviços" },
  { group: "Organização e Segurança", key: "seg_epi", label: "Uso de EPI" },
  { group: "Organização e Segurança", key: "seg_zelo", label: "Zelo pelos Equipamentos" },
  { group: "Organização e Segurança", key: "seg_organizacao", label: "Organização do Estoque" },
  { group: "Comportamento", key: "comp_lideranca", label: "Respeito à Liderança" },
  { group: "Comportamento", key: "comp_equipe", label: "Avaliação da Equipe" },
  { group: "Comportamento", key: "comp_proatividade", label: "Proatividade" },
];

function AvaliarTab() {
  const qc = useQueryClient();
  const techFn = useServerFn(listTechnicians);
  const createFn = useServerFn(createEvaluation);
  const delFn = useServerFn(deleteEvaluation);
  const evalsFn = useServerFn(listEvaluations);
  const techs = useQuery({ queryKey: ["technicians"], queryFn: () => techFn() });
  const evals = useQuery({ queryKey: ["evaluations"], queryFn: () => evalsFn() });

  const [technicianId, setTechnicianId] = useState("");
  const [evalDate, setEvalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [osNumber, setOsNumber] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [notes, setNotes] = useState("");
  const [values, setValues] = useState<FormNumbers>({});

  const submit = useMutation({
    mutationFn: async () => {
      if (!technicianId) throw new Error("Selecione um técnico.");
      const payload: any = {
        technician_id: technicianId,
        eval_date: evalDate,
        os_number: osNumber || null,
        service_type: serviceType || null,
        notes: notes || null,
      };
      for (const f of numFields) {
        const v = values[f.key];
        payload[f.key] = v === undefined || v === "" ? null : Number(v);
      }
      return createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success("Avaliação registrada!");
      setValues({});
      setOsNumber("");
      setServiceType("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["evaluations"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Avaliação removida.");
      qc.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });

  const groups = ["Produtividade", "Qualidade", "Organização e Segurança", "Comportamento"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Nova Avaliação</h2>
        <p className="text-sm text-muted-foreground">
          Preencha as notas de 0 a 10 para cada item. Deixe em branco os que não se aplicam.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
        className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-sm font-semibold">Técnico</label>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              required
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione…</option>
              {(techs.data ?? []).map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold">Data</label>
            <input
              type="date"
              value={evalDate}
              onChange={(e) => setEvalDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">OS</label>
            <input
              value={osNumber}
              onChange={(e) => setOsNumber(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Nº da OS"
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Tipo de Serviço</label>
            <input
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ex: Inspeção"
            />
          </div>
        </div>

        {groups.map((g) => (
          <div key={g}>
            <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-primary">
              {g}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {numFields
                .filter((f) => f.group === g)
                .map((f) => (
                  <div key={f.key}>
                    <label className="text-xs font-semibold text-muted-foreground">
                      {f.label}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="0-10"
                    />
                  </div>
                ))}
            </div>
          </div>
        ))}

        <div>
          <label className="text-sm font-semibold">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={submit.isPending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-brasas)] hover:brightness-110 disabled:opacity-60"
        >
          {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar avaliação
        </button>
      </form>

      <div>
        <h3 className="mb-3 text-lg font-black">Histórico</h3>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/60 text-left">
                <th className="px-4 py-3 font-bold">Data</th>
                <th className="px-4 py-3 font-bold">Técnico</th>
                <th className="px-4 py-3 font-bold">OS</th>
                <th className="px-4 py-3 font-bold">Serviço</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(evals.data ?? []).map((e: any) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">{new Date(e.eval_date).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-2.5 font-semibold">{e.technician?.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.os_number ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.service_type ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => {
                        if (confirm("Excluir avaliação?")) remove.mutate(e.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------- Técnicos ----------

function TecnicosTab() {
  const qc = useQueryClient();
  const techFn = useServerFn(listTechnicians);
  const addFn = useServerFn(addTechnician);
  const techs = useQuery({ queryKey: ["technicians"], queryFn: () => techFn() });
  const [name, setName] = useState("");
  const add = useMutation({
    mutationFn: (n: string) => addFn({ data: { name: n } }),
    onSuccess: () => {
      toast.success("Técnico cadastrado.");
      setName("");
      qc.invalidateQueries({ queryKey: ["technicians"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Técnicos</h2>
        <p className="text-sm text-muted-foreground">Cadastre os técnicos que serão avaliados.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) add.mutate(name.trim());
        }}
        className="flex gap-2 rounded-xl border border-border bg-card p-4 shadow-sm"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do técnico"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={add.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-left">
              <th className="px-4 py-3 font-bold">Nome</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {(techs.data ?? []).map((t: any) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5 font-semibold">{t.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {t.active ? "Ativo" : "Inativo"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Aprovações ----------

function AprovacoesTab() {
  const qc = useQueryClient();
  const profilesFn = useServerFn(listProfiles);
  const setStatusFn = useServerFn(setProfileStatus);
  const profiles = useQuery({ queryKey: ["profiles"], queryFn: () => profilesFn() });

  const update = useMutation({
    mutationFn: (v: { id: string; status: "approved" | "rejected" | "pending" }) =>
      setStatusFn({ data: v }),
    onSuccess: () => {
      toast.success("Atualizado.");
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const pending = (profiles.data ?? []).filter((p: any) => p.status === "pending");
  const others = (profiles.data ?? []).filter((p: any) => p.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight">Aprovações de Cadastro</h2>
        <p className="text-sm text-muted-foreground">
          Novos cadastros aguardando liberação do operador master.
        </p>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-primary">
          Pendentes ({pending.length})
        </h3>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/60 text-left">
                <th className="px-4 py-3 font-bold">Nome</th>
                <th className="px-4 py-3 font-bold">E-mail</th>
                <th className="px-4 py-3 font-bold">Cadastrado em</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p: any) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-semibold">{p.full_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.email}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-2">
                    <button
                      onClick={() => update.mutate({ id: p.id, status: "approved" })}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar
                    </button>
                    <button
                      onClick={() => update.mutate({ id: p.id, status: "rejected" })}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="h-3.5 w-3.5" /> Recusar
                    </button>
                  </td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum cadastro pendente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
          Outros usuários
        </h3>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/60 text-left">
                <th className="px-4 py-3 font-bold">Nome</th>
                <th className="px-4 py-3 font-bold">E-mail</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {others.map((p: any) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-semibold">{p.full_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.email}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                        p.status === "approved"
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {p.status === "approved" ? "Aprovado" : "Recusado"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right space-x-2">
                    {p.status !== "approved" && (
                      <button
                        onClick={() => update.mutate({ id: p.id, status: "approved" })}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110"
                      >
                        Aprovar
                      </button>
                    )}
                    {p.status !== "rejected" && (
                      <button
                        onClick={() => update.mutate({ id: p.id, status: "rejected" })}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-bold text-destructive hover:bg-destructive/10"
                      >
                        Recusar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {others.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum outro usuário.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}