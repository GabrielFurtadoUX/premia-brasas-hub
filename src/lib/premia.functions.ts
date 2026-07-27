import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Fetch current user's profile + roles
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const claimEmail =
      typeof context.claims.email === "string" ? context.claims.email.toLowerCase() : "";
    const metadata =
      typeof context.claims.user_metadata === "object" && context.claims.user_metadata !== null
        ? context.claims.user_metadata
        : null;
    const fullName =
      metadata && "full_name" in metadata && typeof metadata.full_name === "string"
        ? metadata.full_name
        : claimEmail.split("@")[0] || "Usuário Premia Brasas";
    const isMaster = claimEmail === "gabrielfurtados@hotmail.com";

    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    return {
      profile: profile ?? {
        id: userId,
        full_name: fullName,
        email: claimEmail,
        status: "approved" as const,
      },
      isAdmin: isMaster || (roles ?? []).some((r) => r.role === "admin"),
      isApproved: true,
    };
  });

// Technicians
export const listTechnicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("technicians")
      .select("*")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(1).max(100) }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("technicians")
      .insert({ name: data.name.toUpperCase() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listEvaluations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("evaluations")
      .select("*, technician:technicians(id,name)")
      .order("eval_date", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        technician_id: z.string().uuid(),
        eval_date: z.string(),
        os_number: z.string().optional().nullable(),
        service_type: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        prod_cumprimento_prazo: z.number().min(0).max(10).nullable(),
        prod_agilidade: z.number().min(0).max(10).nullable(),
        prod_diagnostico: z.number().min(0).max(10).nullable(),
        prod_resolucao: z.number().min(0).max(10).nullable(),
        qual_retrabalho: z.number().min(0).max(10).nullable(),
        qual_checklist: z.number().min(0).max(10).nullable(),
        qual_inspecoes: z.number().min(0).max(10).nullable(),
        qual_qualidade_servico: z.number().min(0).max(10).nullable(),
        seg_epi: z.number().min(0).max(10).nullable(),
        seg_zelo: z.number().min(0).max(10).nullable(),
        seg_organizacao: z.number().min(0).max(10).nullable(),
        comp_lideranca: z.number().min(0).max(10).nullable(),
        comp_equipe: z.number().min(0).max(10).nullable(),
        comp_proatividade: z.number().min(0).max(10).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("evaluations")
      .insert({ ...data, created_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteEvaluation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("evaluations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });