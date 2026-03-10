-- Seed categorias e subcategorias da ferramenta Minhas Ferramentas de Gestão
-- Idempotente: usa ON CONFLICT ou verificação por name.

-- Categorias (order: 0 Receita, 1 CMV, 2 Mão-de-Obra, 3 Despesas)
INSERT INTO public.gestao_categories (id, name, "order") VALUES
  ('a1000001-0000-4000-8000-000000000001'::uuid, 'Receita', 0),
  ('a1000001-0000-4000-8000-000000000002'::uuid, 'CMV', 1),
  ('a1000001-0000-4000-8000-000000000003'::uuid, 'Mão-de-Obra', 2),
  ('a1000001-0000-4000-8000-000000000004'::uuid, 'Despesas (Fixas e Variáveis)', 3)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "order" = EXCLUDED."order";

-- Subcategorias Receita (order 0..n)
INSERT INTO public.gestao_subcategories (id, category_id, name, "order") VALUES
  ('b2000001-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'PIX', 0),
  ('b2000001-0000-4000-8000-000000000002'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'Cartão Crédito', 1),
  ('b2000001-0000-4000-8000-000000000003'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'Cartão Débito', 2),
  ('b2000001-0000-4000-8000-000000000004'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'Dinheiro', 3),
  ('b2000001-0000-4000-8000-000000000005'::uuid, 'a1000001-0000-4000-8000-000000000001'::uuid, 'Outros (Receita)', 4)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "order" = EXCLUDED."order";

-- Subcategorias CMV
INSERT INTO public.gestao_subcategories (id, category_id, name, "order") VALUES
  ('b2000002-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000002'::uuid, 'Entrada de Produtos', 0),
  ('b2000002-0000-4000-8000-000000000002'::uuid, 'a1000001-0000-4000-8000-000000000002'::uuid, 'Açougue', 1),
  ('b2000002-0000-4000-8000-000000000003'::uuid, 'a1000001-0000-4000-8000-000000000002'::uuid, 'Ceasa', 2),
  ('b2000002-0000-4000-8000-000000000004'::uuid, 'a1000001-0000-4000-8000-000000000002'::uuid, 'Bebidas', 3),
  ('b2000002-0000-4000-8000-000000000005'::uuid, 'a1000001-0000-4000-8000-000000000002'::uuid, 'Embalagens', 4)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "order" = EXCLUDED."order";

-- Subcategorias Mão-de-Obra
INSERT INTO public.gestao_subcategories (id, category_id, name, "order") VALUES
  ('b2000003-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000003'::uuid, 'Salários', 0),
  ('b2000003-0000-4000-8000-000000000002'::uuid, 'a1000001-0000-4000-8000-000000000003'::uuid, 'Pró-labore', 1),
  ('b2000003-0000-4000-8000-000000000003'::uuid, 'a1000001-0000-4000-8000-000000000003'::uuid, 'Diárias', 2)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "order" = EXCLUDED."order";

-- Subcategorias Despesas (Fixas e Variáveis)
INSERT INTO public.gestao_subcategories (id, category_id, name, "order") VALUES
  ('b2000004-0000-4000-8000-000000000001'::uuid, 'a1000001-0000-4000-8000-000000000004'::uuid, 'Impostos', 0),
  ('b2000004-0000-4000-8000-000000000002'::uuid, 'a1000001-0000-4000-8000-000000000004'::uuid, 'Despesas Prediais', 1),
  ('b2000004-0000-4000-8000-000000000003'::uuid, 'a1000001-0000-4000-8000-000000000004'::uuid, 'Terceiros', 2),
  ('b2000004-0000-4000-8000-000000000004'::uuid, 'a1000001-0000-4000-8000-000000000004'::uuid, 'Utilidades', 3),
  ('b2000004-0000-4000-8000-000000000005'::uuid, 'a1000001-0000-4000-8000-000000000004'::uuid, 'Publicidade', 4),
  ('b2000004-0000-4000-8000-000000000006'::uuid, 'a1000001-0000-4000-8000-000000000004'::uuid, 'Materiais', 5),
  ('b2000004-0000-4000-8000-000000000007'::uuid, 'a1000001-0000-4000-8000-000000000004'::uuid, 'Despesas Gerais', 6),
  ('b2000004-0000-4000-8000-000000000008'::uuid, 'a1000001-0000-4000-8000-000000000004'::uuid, 'Despesas Financeiras', 7)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, "order" = EXCLUDED."order";
