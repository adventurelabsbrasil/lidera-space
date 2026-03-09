-- =============================================================================
-- Space (Lidera) — Seed mínimo (programa + módulo + aula)
-- Tabelas space_* (após migração 20260311100000_space_tables_prefix.sql).
-- Rode no SQL Editor do Supabase do cliente ou: supabase db execute --file supabase/seeds/seed_minimo.sql
-- =============================================================================

INSERT INTO public.space_programs (id, title, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Programa de Liderança',
  'Formação em liderança para gestores de escola.'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.space_modules (id, program_id, title, "order")
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Módulo 1 - Fundamentos',
  1
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.space_lessons (id, module_id, title, video_url, material_url, "order")
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'Aula 1 - Introdução à Liderança',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  'https://drive.google.com',
  1
)
ON CONFLICT (id) DO NOTHING;
