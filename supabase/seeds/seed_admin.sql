-- =============================================================================
-- Lidera Space — Definir primeiro usuário admin por e-mail
-- =============================================================================
-- Rode UMA VEZ após criar o primeiro usuário em Authentication → Users.
-- Substitua 'admin@seu-dominio.com' pelo e-mail da conta com acesso total.
-- No SQL Editor do Supabase ou: supabase db execute --file supabase/seeds/seed_admin.sql
-- =============================================================================

UPDATE public.users
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin@seu-dominio.com' LIMIT 1
);
