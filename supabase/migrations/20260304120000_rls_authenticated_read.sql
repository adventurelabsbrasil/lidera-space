-- =============================================================================
-- RLS: Leitura para usuários autenticados (substitui auth.role() deprecated)
-- =============================================================================
-- Troca políticas de SELECT em programs, modules e lessons para usar TO authenticated
-- em vez de USING (auth.role() = 'authenticated'), conforme recomendação Supabase.
-- Políticas de admin (INSERT/UPDATE/DELETE) permanecem inalteradas.
-- =============================================================================

-- Programs: remover política antiga e criar com TO authenticated
DROP POLICY IF EXISTS "Anyone logged in can read programs" ON public.programs;
CREATE POLICY "Authenticated can read programs"
  ON public.programs FOR SELECT
  TO authenticated
  USING (true);

-- Modules: remover política antiga e criar com TO authenticated
DROP POLICY IF EXISTS "Anyone logged in can read modules" ON public.modules;
CREATE POLICY "Authenticated can read modules"
  ON public.modules FOR SELECT
  TO authenticated
  USING (true);

-- Lessons: remover política antiga e criar com TO authenticated
DROP POLICY IF EXISTS "Anyone logged in can read lessons" ON public.lessons;
CREATE POLICY "Authenticated can read lessons"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (true);
