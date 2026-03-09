-- =============================================================================
-- REMOVER SPACE DO PROJETO ADVENTURE LABS (rodar no NOSSO Supabase)
-- =============================================================================
-- Use este script SE você rodou as migrações do Space por engano no projeto
-- ftctmseyrqhckutpfdeq (Adventure Labs). Ele remove apenas tabelas space_*
-- e o trigger/função do Space. NÃO mexe em crm_*, adv_* nem em outras tabelas.
--
-- ATENÇÃO: Se no seu projeto existiam tabelas "programs", "modules", "lessons",
-- "notes", "progress" (ex.: site/curso) e a migração Space as RENOMEOU para
-- space_*, ao dropar você PERDE esses dados. Nesse caso seria preciso
-- renomear de volta (space_* → nome original) em vez de dropar.
-- =============================================================================

-- 1. Remover trigger que insere em space_users ao criar usuário em auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Remover função do Space (inserção em space_users)
DROP FUNCTION IF EXISTS public.handle_new_space_user();

-- 3. Dropar tabelas space_* na ordem correta (respeitando FKs)
DROP TABLE IF EXISTS public.space_progress CASCADE;
DROP TABLE IF EXISTS public.space_notes CASCADE;
DROP TABLE IF EXISTS public.space_lessons CASCADE;
DROP TABLE IF EXISTS public.space_modules CASCADE;
DROP TABLE IF EXISTS public.space_programs CASCADE;
DROP TABLE IF EXISTS public.space_users CASCADE;

-- Pronto. O projeto Adventure Labs deixa de ter objetos do Space.
