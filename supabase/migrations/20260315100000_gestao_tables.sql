-- =============================================================================
-- Ferramenta "Minhas Ferramentas de Gestão" (programa Lucro e Liberdade)
-- Tabelas gestao_* no Supabase do Lidera; RLS por user_id + admin.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. gestao_categories (categorias do DRE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gestao_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gestao_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gestao_categories_authenticated_read"
  ON public.gestao_categories FOR SELECT
  USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 2. gestao_subcategories (subcategorias por categoria)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gestao_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.gestao_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gestao_subcategories_category_id
  ON public.gestao_subcategories(category_id);

ALTER TABLE public.gestao_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gestao_subcategories_authenticated_read"
  ON public.gestao_subcategories FOR SELECT
  USING (auth.role() = 'authenticated');

-- -----------------------------------------------------------------------------
-- 3. gestao_lancamentos (lançamentos por usuário e programa)
-- amount_cents: positivo = receita, negativo = despesa
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gestao_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.space_users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.space_programs(id) ON DELETE CASCADE,
  subcategory_id UUID NOT NULL REFERENCES public.gestao_subcategories(id) ON DELETE RESTRICT,
  amount_cents INT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gestao_lancamentos_user_date
  ON public.gestao_lancamentos(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_gestao_lancamentos_program_id
  ON public.gestao_lancamentos(program_id);
CREATE INDEX IF NOT EXISTS idx_gestao_lancamentos_subcategory_id
  ON public.gestao_lancamentos(subcategory_id);

ALTER TABLE public.gestao_lancamentos ENABLE ROW LEVEL SECURITY;

-- Usuário vê/edita só os próprios; admin vê todos
CREATE POLICY "gestao_lancamentos_select_own_or_admin"
  ON public.gestao_lancamentos FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.space_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "gestao_lancamentos_insert_own"
  ON public.gestao_lancamentos FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "gestao_lancamentos_update_own_or_admin"
  ON public.gestao_lancamentos FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.space_users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.space_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "gestao_lancamentos_delete_own_or_admin"
  ON public.gestao_lancamentos FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.space_users WHERE id = auth.uid() AND role = 'admin')
  );
