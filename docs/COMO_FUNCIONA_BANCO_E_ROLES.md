# Como funciona o banco de dados e os roles do Space (LMS)

Este documento é a referência única para o **app Space** (área de membros / LMS): schema, usuários, roles, RLS e setup. Aplica-se **apenas** ao produto Space; outros produtos da Adventure (Admin, CRM, site) têm suas próprias documentações.

Para checklist do projeto Lidera (projeto Supabase, admin, migração aplicada), ver [SETUP_PROJETO_LIDERA.md](SETUP_PROJETO_LIDERA.md).

---

## 1. Cenários de tabelas

O app pode rodar com tabelas **com** ou **sem** prefixo, conforme a migração aplicada no Supabase do cliente:

| Cenário | Tabelas | Migração |
|---------|---------|----------|
| **Com prefixo `space_*`** | `space_users`, `space_programs`, `space_modules`, `space_lessons`, `space_notes`, `space_progress` | `20260311100000_space_tables_prefix.sql` — uso atual (ex.: Lidera). |
| **Sem prefixo** | `users`, `programs`, `modules`, `lessons`, `notes`, `progress` | `20260301195140_init_schema.sql` + `20260304120000_rls_authenticated_read.sql` (e código ajustado para nomes sem prefixo). |

O código em produção (Lidera) usa **space_***. O Supabase do cliente que compra o app é a única fonte de dados; a Adventure não armazena dados do Space no próprio Supabase.

---

## 2. Schema do banco

- **Perfil de usuário:** `space_users` (ou `users`). Campos: `id` (UUID, PK, FK para `auth.users`), `email`, `role` (`admin` | `aluno`), `created_at`, `updated_at`. Populada por trigger ao inserir em `auth.users`.
- **Conteúdo:** `space_programs` → `space_modules` → `space_lessons` (FKs em cascata). Cada programa tem módulos; cada módulo tem aulas.
- **Interação:** `space_notes` (user_id, lesson_id, content), `space_progress` (user_id, lesson_id, completed). UNIQUE em (user_id, lesson_id) em ambas.

Colunas principais e FKs estão definidas em `supabase/migrations/20260301195140_init_schema.sql` (sem prefixo) e em `supabase/migrations/20260311100000_space_tables_prefix.sql` (com prefixo). A migração com prefixo é **idempotente** (pode ser executada mais de uma vez sem erro).

---

## 3. Usuários

- **Criação:** Ao se cadastrar ou fazer login (e-mail/senha ou Google), o Supabase Auth insere em `auth.users`. Um trigger insere na tabela de perfil (`space_users` ou `users`) com `role = 'aluno'`.
- **Gestão:** O cliente (ex.: Lidera) gerencia usuários no próprio projeto Supabase: Authentication → Users, e na tabela de perfil para roles. A Adventure não cria nem altera usuários no lugar do cliente.
- **Primeiro admin:** Após criar o primeiro usuário em Authentication, rodar o seed `supabase/seeds/seed_admin.sql` (ajustando o e-mail) ou `UPDATE public.space_users SET role = 'admin' WHERE email = '...';`.

---

## 4. Roles

| Role | Permissões |
|------|------------|
| **aluno** | Ler programas, módulos e aulas; gerenciar as próprias notas e progresso (marcar aula concluída). |
| **admin** | Tudo do aluno + criar/editar/excluir programas, módulos e aulas; listar e alterar roles de usuários. |

O middleware e as Server Actions leem a role na tabela de perfil para decidir entre visão “Meus Programas” (aluno) e “Gestão de Programas” (admin).

---

## 5. RLS (resumo)

- **Tabela de perfil:** Usuário vê o próprio registro; admin vê todos e pode atualizar roles.
- **Programs, modules, lessons:** SELECT para `authenticated`; admin tem ALL (INSERT/UPDATE/DELETE).
- **Notes e progress:** Usuário tem ALL apenas nos próprios registros; admin tem SELECT em todos.

Políticas exatas estão nas migrações referidas acima.

---

## 6. Setup para novo cliente

1. Criar projeto Supabase (conta do cliente).
2. Rodar a migração adequada: `20260311100000_space_tables_prefix.sql` (recomendado) ou init_schema + rls_authenticated_read.
3. Configurar no app as env `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para esse projeto.
4. Criar primeiro usuário em Authentication; em seguida promover a admin via seed ou SQL.
5. (Opcional) Rodar `seed_minimo.sql` para conteúdo de exemplo.

A Adventure entrega o app, o schema/RLS e esta documentação; o cliente é dono dos dados no próprio Supabase.

---

## 7. Organizações (escopo apenas do app Space)

**Aviso de escopo:** O que se segue aplica **somente** ao produto Space (LMS). Não se aplica a outros produtos da Adventure nem a outros clientes.

- A **criação e gestão de organizações** (ou equivalentes: clientes B2B, matrículas, isolamento por programa) **dentro do app Space** é responsabilidade do **cliente que comprou o Space** (ex.: Lidera), não da Adventure.
- A Adventure, no contexto do Space, fornece o app, o schema/RLS, a documentação e o acesso (deploy, Supabase do cliente). Qualquer feature futura de “organizações” ou “enrollments” no Space será self-service no painel do app, usado pelo cliente do Space, sem a Adventure criar ou gerir organizações por eles.
- Outros produtos ou clientes da Adventure têm seus próprios modelos de responsabilidade.
