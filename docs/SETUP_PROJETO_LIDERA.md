# Setup do Space no projeto Supabase do Lidera

Use este guia quando for configurar o app Space no **projeto Supabase do Lidera** (não no da Adventure Labs).

---

## Status Lidera (projeto atual)

- **Projeto Supabase:** xiqlaxjtngwecidyoxbs (conta do Lidera).
- **App:** lideraspace.adventurelabs.com.br (env apontando para o projeto acima).
- **Admin inicial:** contato@somoslidera.com.br (id `3eccb8d3-8067-4184-830c-8fc1b74aab6a`); promovido via `seed_admin.sql`.
- **Migração:** `20260311100000_space_tables_prefix.sql` aplicada; tabelas `space_*` + RLS ativos. A migração é **idempotente** (pode ser rodada de novo sem erro: usa `DROP CONSTRAINT IF EXISTS`, `DROP POLICY IF EXISTS` antes de recriar).
- **Seed admin:** funciona com `space_users` ou `users`; detecta automaticamente qual tabela existe.

---

## Se você rodou as migrações do Space no projeto errado (Adventure Labs)

1. **No projeto Adventure Labs (ftctmseyrqhckutpfdeq):**  
   Rode no SQL Editor o script de limpeza para remover as tabelas Space:
   - No monorepo: `apps/clientes/lidera/space/supabase/scripts/rollback_space_from_adventure_project.sql`

2. **Depois** siga os passos abaixo no projeto **do Lidera** (xiqlaxjtngwecidyoxbs).

---

## Passos no projeto Supabase do Lidera (xiqlaxjtngwecidyoxbs)

1. **Migração do schema**  
   No SQL Editor do projeto do Lidera, rode **uma** das opções:
   - **Recomendado (tabelas com prefixo):** copie e execute o conteúdo de  
     `supabase/migrations/20260311100000_space_tables_prefix.sql`  
     (A migração é idempotente: pode rodar de novo sem erro.)
   - **Alternativa (sem prefixo):** execute primeiro `20260301195140_init_schema.sql`, depois `20260304120000_rls_authenticated_read.sql` (e avise o time para o app usar tabelas sem prefixo).

2. **Criar usuário admin**  
   Depois que o usuário (ex.: contato@somoslidera.com.br) existir em **Authentication → Users**, rode no mesmo projeto:
   - `supabase/seeds/seed_admin.sql`

3. **Conteúdo inicial (opcional)**  
   Para um programa/módulo/aula de exemplo:
   - `supabase/seeds/seed_minimo.sql`

4. **App**  
   O deploy em lideraspace.adventurelabs.com.br deve usar as env do projeto do Lidera:  
   `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` = projeto **xiqlaxjtngwecidyoxbs**.
