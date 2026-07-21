
-- Enums
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.app_role AS ENUM ('admin', 'tecnico');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  status public.approval_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security-definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile basics" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Technicians
CREATE TABLE public.technicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technicians TO authenticated;
GRANT ALL ON public.technicians TO service_role;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users read technicians" ON public.technicians
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'approved')
  );
CREATE POLICY "Admins manage technicians" ON public.technicians
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.technicians (name) VALUES ('EDIANDRO'), ('MAX'), ('IURY');

-- Evaluations: one row per technician per evaluation date, holds notes for the 4 categories
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  eval_date DATE NOT NULL DEFAULT CURRENT_DATE,
  os_number TEXT,
  service_type TEXT,
  notes TEXT,
  -- PRODUTIVIDADE (0-10 each)
  prod_cumprimento_prazo NUMERIC(4,2),
  prod_agilidade NUMERIC(4,2),
  prod_diagnostico NUMERIC(4,2),
  prod_resolucao NUMERIC(4,2),
  -- QUALIDADE
  qual_retrabalho NUMERIC(4,2),
  qual_checklist NUMERIC(4,2),
  qual_inspecoes NUMERIC(4,2),
  qual_qualidade_servico NUMERIC(4,2),
  -- ORGANIZAÇÃO E SEGURANÇA
  seg_epi NUMERIC(4,2),
  seg_zelo NUMERIC(4,2),
  seg_organizacao NUMERIC(4,2),
  -- COMPORTAMENTO
  comp_lideranca NUMERIC(4,2),
  comp_equipe NUMERIC(4,2),
  comp_proatividade NUMERIC(4,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluations TO authenticated;
GRANT ALL ON public.evaluations TO service_role;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users read evaluations" ON public.evaluations
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'approved')
  );
CREATE POLICY "Admins manage evaluations" ON public.evaluations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_evaluations_upd BEFORE UPDATE ON public.evaluations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- On new user: create profile. Master email = auto-approved admin.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_full_name TEXT;
  v_is_master BOOLEAN;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_is_master := LOWER(NEW.email) = 'gabrielfurtados@hotmail.com';

  INSERT INTO public.profiles (id, full_name, email, status)
  VALUES (NEW.id, v_full_name, NEW.email, CASE WHEN v_is_master THEN 'approved'::approval_status ELSE 'pending'::approval_status END);

  IF v_is_master THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'tecnico') ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
