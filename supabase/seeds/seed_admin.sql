-- =============================================================================
-- Space (Lidera) — Definir primeiro usuário admin
-- =============================================================================
-- Rode UMA VEZ após o usuário existir em auth.users e na tabela de perfil (trigger).
-- Cliente Lidera: id = 3eccb8d3-8067-4184-830c-8fc1b74aab6a, email = contato@somoslidera.com.br
-- Funciona com ou sem migração space_*: usa space_users se existir, senão users.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_users') THEN
    UPDATE public.space_users SET role = 'admin'
    WHERE id IN (SELECT id FROM auth.users WHERE email = 'contato@somoslidera.com.br' LIMIT 1);
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    UPDATE public.users SET role = 'admin'
    WHERE id IN (SELECT id FROM auth.users WHERE email = 'contato@somoslidera.com.br' LIMIT 1);
  ELSE
    RAISE NOTICE 'Nenhuma tabela de perfil (space_users ou users) neste projeto. Rode antes: supabase/migrations/20260301195140_init_schema.sql OU 20260311100000_space_tables_prefix.sql no SQL Editor.';
  END IF;
END $$;
