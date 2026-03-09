-- =============================================================================
-- Space (LMS / área de membros): prefixo space_ (igual adv_ e crm_)
-- =============================================================================
-- Renomeia users, programs, modules, lessons, notes, progress para space_*
-- e atualiza RLS/trigger. Se public.users não existir (ex.: já é crm_users),
-- cria space_users e trigger para novos usuários.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Remover trigger que insere em public.users
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- -----------------------------------------------------------------------------
-- 2. Remover políticas RLS (apenas se as tabelas existirem)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
    DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
    DROP POLICY IF EXISTS "Admins can update user roles" ON public.users;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'programs') THEN
    DROP POLICY IF EXISTS "Anyone logged in can read programs" ON public.programs;
    DROP POLICY IF EXISTS "Authenticated can read programs" ON public.programs;
    DROP POLICY IF EXISTS "Admins can manage programs" ON public.programs;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'modules') THEN
    DROP POLICY IF EXISTS "Anyone logged in can read modules" ON public.modules;
    DROP POLICY IF EXISTS "Authenticated can read modules" ON public.modules;
    DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lessons') THEN
    DROP POLICY IF EXISTS "Anyone logged in can read lessons" ON public.lessons;
    DROP POLICY IF EXISTS "Authenticated can read lessons" ON public.lessons;
    DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    DROP POLICY IF EXISTS "Users manage own notes" ON public.notes;
    DROP POLICY IF EXISTS "Admins view all notes" ON public.notes;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'progress') THEN
    DROP POLICY IF EXISTS "Users manage own progress" ON public.progress;
    DROP POLICY IF EXISTS "Admins view all progress" ON public.progress;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Remover FKs que referenciam as tabelas a renomear (apenas em public)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.conname AS constraint_name,
           n_own.nspname AS own_schema,
           t_own.relname AS own_table
    FROM pg_constraint c
    JOIN pg_class t_own ON t_own.oid = c.conrelid
    JOIN pg_namespace n_own ON n_own.oid = t_own.relnamespace
    WHERE c.contype = 'f'
      AND n_own.nspname = 'public'
      AND (
        c.confrelid IN (
          (SELECT oid FROM pg_class WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')),
          (SELECT oid FROM pg_class WHERE relname = 'programs' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')),
          (SELECT oid FROM pg_class WHERE relname = 'modules' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')),
          (SELECT oid FROM pg_class WHERE relname = 'lessons' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
        )
        OR (t_own.relname IN ('notes', 'progress', 'modules', 'lessons') AND n_own.nspname = 'public')
      )
  ) LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', r.own_schema, r.own_table, r.constraint_name);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Renomear tabelas ou criar space_users
-- -----------------------------------------------------------------------------
-- 4a. users → space_users (se existir); senão criar space_users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE public.users RENAME TO space_users;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_users') THEN
    CREATE TABLE public.space_users (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'aluno' CHECK (role IN ('admin', 'aluno')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE public.space_users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 4b. programs, modules, lessons, notes, progress → space_* (só se existirem)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'programs') THEN
    ALTER TABLE public.programs RENAME TO space_programs;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'modules') THEN
    ALTER TABLE public.modules RENAME TO space_modules;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lessons') THEN
    ALTER TABLE public.lessons RENAME TO space_lessons;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    ALTER TABLE public.notes RENAME TO space_notes;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'progress') THEN
    ALTER TABLE public.progress RENAME TO space_progress;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. Recriar FKs (apenas se as tabelas space_* existirem; DROP IF EXISTS para idempotência)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_modules') THEN
    ALTER TABLE public.space_modules DROP CONSTRAINT IF EXISTS space_modules_program_id_fkey;
    ALTER TABLE public.space_modules
      ADD CONSTRAINT space_modules_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES public.space_programs(id) ON DELETE CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_lessons') THEN
    ALTER TABLE public.space_lessons DROP CONSTRAINT IF EXISTS space_lessons_module_id_fkey;
    ALTER TABLE public.space_lessons
      ADD CONSTRAINT space_lessons_module_id_fkey
      FOREIGN KEY (module_id) REFERENCES public.space_modules(id) ON DELETE CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_notes') THEN
    ALTER TABLE public.space_notes DROP CONSTRAINT IF EXISTS space_notes_user_id_fkey;
    ALTER TABLE public.space_notes DROP CONSTRAINT IF EXISTS space_notes_lesson_id_fkey;
    ALTER TABLE public.space_notes ADD CONSTRAINT space_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.space_users(id) ON DELETE CASCADE;
    ALTER TABLE public.space_notes ADD CONSTRAINT space_notes_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.space_lessons(id) ON DELETE CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_progress') THEN
    ALTER TABLE public.space_progress DROP CONSTRAINT IF EXISTS space_progress_user_id_fkey;
    ALTER TABLE public.space_progress DROP CONSTRAINT IF EXISTS space_progress_lesson_id_fkey;
    ALTER TABLE public.space_progress ADD CONSTRAINT space_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.space_users(id) ON DELETE CASCADE;
    ALTER TABLE public.space_progress ADD CONSTRAINT space_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.space_lessons(id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Trigger: novo usuário auth → space_users
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_space_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.space_users (id, email, role)
  VALUES (NEW.id, COALESCE(NEW.email, ''), 'aluno');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_space_user();

-- -----------------------------------------------------------------------------
-- 7. RLS nas tabelas space_* (DROP IF EXISTS para idempotência)
-- -----------------------------------------------------------------------------
ALTER TABLE public.space_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "space_users_select_own" ON public.space_users;
DROP POLICY IF EXISTS "space_admins_select_all_users" ON public.space_users;
DROP POLICY IF EXISTS "space_admins_update_roles" ON public.space_users;
CREATE POLICY "space_users_select_own" ON public.space_users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "space_admins_select_all_users" ON public.space_users FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.space_users WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "space_admins_update_roles" ON public.space_users FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.space_users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.space_users WHERE id = auth.uid() AND role = 'admin'));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_programs') THEN
    ALTER TABLE public.space_programs ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "space_authenticated_read_programs" ON public.space_programs;
    DROP POLICY IF EXISTS "space_admins_manage_programs" ON public.space_programs;
    CREATE POLICY "space_authenticated_read_programs" ON public.space_programs FOR SELECT TO authenticated USING (true);
    CREATE POLICY "space_admins_manage_programs" ON public.space_programs FOR ALL USING (EXISTS (SELECT 1 FROM public.space_users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_modules') THEN
    ALTER TABLE public.space_modules ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "space_authenticated_read_modules" ON public.space_modules;
    DROP POLICY IF EXISTS "space_admins_manage_modules" ON public.space_modules;
    CREATE POLICY "space_authenticated_read_modules" ON public.space_modules FOR SELECT TO authenticated USING (true);
    CREATE POLICY "space_admins_manage_modules" ON public.space_modules FOR ALL USING (EXISTS (SELECT 1 FROM public.space_users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_lessons') THEN
    ALTER TABLE public.space_lessons ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "space_authenticated_read_lessons" ON public.space_lessons;
    DROP POLICY IF EXISTS "space_admins_manage_lessons" ON public.space_lessons;
    CREATE POLICY "space_authenticated_read_lessons" ON public.space_lessons FOR SELECT TO authenticated USING (true);
    CREATE POLICY "space_admins_manage_lessons" ON public.space_lessons FOR ALL USING (EXISTS (SELECT 1 FROM public.space_users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_notes') THEN
    ALTER TABLE public.space_notes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "space_users_manage_own_notes" ON public.space_notes;
    DROP POLICY IF EXISTS "space_admins_view_all_notes" ON public.space_notes;
    CREATE POLICY "space_users_manage_own_notes" ON public.space_notes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "space_admins_view_all_notes" ON public.space_notes FOR SELECT USING (EXISTS (SELECT 1 FROM public.space_users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_progress') THEN
    ALTER TABLE public.space_progress ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "space_users_manage_own_progress" ON public.space_progress;
    DROP POLICY IF EXISTS "space_admins_view_all_progress" ON public.space_progress;
    CREATE POLICY "space_users_manage_own_progress" ON public.space_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "space_admins_view_all_progress" ON public.space_progress FOR SELECT USING (EXISTS (SELECT 1 FROM public.space_users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 8. Índices
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_notes') THEN
    CREATE INDEX IF NOT EXISTS idx_space_notes_user_lesson ON public.space_notes(user_id, lesson_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_progress') THEN
    CREATE INDEX IF NOT EXISTS idx_space_progress_user_lesson ON public.space_progress(user_id, lesson_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_modules') THEN
    CREATE INDEX IF NOT EXISTS idx_space_modules_program_id ON public.space_modules(program_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_lessons') THEN
    CREATE INDEX IF NOT EXISTS idx_space_lessons_module_id ON public.space_lessons(module_id);
  END IF;
END $$;
