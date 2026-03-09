## Lidera Space — Visão Geral do MVP

Lidera Space é a área de membros da Adventure Labs para desenvolvimento de líderes em redes de escolas.  
Modelo: **SaaS B2B2C**, onde cada cliente possui seu próprio projeto Supabase (isolamento por projeto, não por `tenant_id`).

### Stack
- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS, shadcn/ui.
- **Backend/Auth/DB**: Supabase (`@supabase/ssr`), PostgreSQL, RLS habilitado em todas as tabelas.
- **Infra**: pensada para rodar em Vercel + Supabase.

---

## Cenário de tabelas (qual usar)

Este app pode rodar com **dois** cenários de banco:

| Cenário | Tabelas | Quando usar |
|--------|---------|-------------|
| **Com prefixo `space_*`** | `space_users`, `space_programs`, `space_modules`, `space_lessons`, `space_notes`, `space_progress` | Projeto Supabase do cliente já teve a migração `20260311100000_space_tables_prefix.sql` aplicada (ex.: Lidera). **Este é o cenário atual do código.** |
| **Sem prefixo** | `users`, `programs`, `modules`, `lessons`, `notes`, `progress` | Projeto exclusivo novo, sem a migração de prefixo; use `20260301195140_init_schema.sql` e altere no código os `from('space_*')` para os nomes sem prefixo. |

O deploy em `lideraspace.adventurelabs.com.br` usa o **Supabase do Lidera** com tabelas `space_*`. As env `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` devem apontar para o projeto do cliente. Status e checklist do setup Lidera: [docs/SETUP_PROJETO_LIDERA.md](docs/SETUP_PROJETO_LIDERA.md).

---

## Arquitetura de Domínio

Hierarquia de conteúdo:
- `space_programs` (ou `programs`) → Programas (ex.: Programa de Liderança)
- `space_modules` (ou `modules`) → Módulos dentro de um programa
- `space_lessons` (ou `lessons`) → Aulas dentro de um módulo
- `space_notes` (ou `notes`) → Anotações em texto por aula e por aluno
- `space_progress` (ou `progress`) → Progresso (checkbox de conclusão) por aula e por aluno

Tabelas: schema inicial em `supabase/migrations/20260301195140_init_schema.sql`; schema com prefixo em `supabase/migrations/20260311100000_space_tables_prefix.sql`. Trigger popula a tabela de perfil (users ou space_users) a partir de `auth.users`. RLS ativado em todas as tabelas; políticas por `role` (`admin` x `aluno`) e `user_id`.

---

## Fluxos Principais Implementados

### 1. Autenticação e sessão (CIPHER)
- `app/actions/auth.ts`
  - `login(formData)` → email/senha via Supabase Auth, redireciona para `/dashboard`.
  - `logout()` → encerra sessão e redireciona para `/login`.
- `middleware.ts` + `utils/supabase/middleware.ts`
  - Refresca sessão via cookies em cada request.
  - Protege `/dashboard` e subrotas; redireciona não autenticados para `/login`.

### 2. Gestão de conteúdo (admin)
- `app/actions/admin.ts`
  - `requireAdmin()` garante que apenas usuários com `role = 'admin'` acessem as actions.
  - CRUD mínimo:
    - `getPrograms`, `getProgramById`
    - `getModulesByProgram`, `getLessonsByModule`
    - `createProgram`, `createModule`, `createLesson`
  - Usa `revalidatePath` para manter o cache do App Router em sincronia.
- UI:
  - `app/dashboard/page.tsx`:
    - Busca o perfil em `space_users` (ou `users`) e decide entre visão **admin** ou **aluno**.
    - Admin → `AdminView` (`components/dashboard/admin-view.tsx`), com:
      - Tabela de programas.
      - Dialog para criar novo programa (Server Action + `useActionState`).
  - `app/dashboard/programs/[id]/page.tsx` + `ProgramDetailView`
    - Lista módulos e aulas de um programa.
    - Dialogs para criar módulo e aula.

### 3. Área do aluno (consumo de conteúdo)
- `app/actions/student.ts`
  - `listStudentPrograms()` → lista todos os programas que o aluno pode ver (RLS garante acesso apenas autenticado).
  - `getStudentProgram(programId)` → detalhe de um programa.
  - `getStudentProgramModules(programId)` → módulos + aulas de um programa.
  - `getLessonDetail(lessonId)` → aula + nota atual + status de conclusão para o usuário logado.
  - `saveLessonNote(prev, formData)` → upsert em `notes` por `(user_id, lesson_id)`.
  - `toggleLessonProgress(prev, formData)` → cria ou alterna `progress.completed` para `(user_id, lesson_id)`.
- Páginas:
  - `app/dashboard/page.tsx`
    - Se `role === 'admin'` → visão admin.
    - Caso contrário → seção **“Meus Programas”** com cards dos programas e links para `/dashboard/courses/[id]`.
  - `app/dashboard/courses/[id]/page.tsx`
    - Página de programa para o aluno, mostra módulos e aulas.
  - `app/dashboard/lessons/[id]/page.tsx`
    - Carrega `getLessonDetail` e delega para `LessonView`.
- UI de aula:
  - `components/dashboard/lesson-view.tsx` (client component)
    - Player de vídeo (iframe YouTube ou similar).
    - Link para material externo (Google Drive, etc.).
    - Card de **Progresso** (checkbox “concluída” via Server Action).
    - Card de **Anotações** (textarea persistida em `notes`).

### 4. Home e layout
- `app/page.tsx`
  - Landing mínima:
    - Se logado → CTA “Ir para o dashboard”.
    - Se não logado → CTA “Entrar na plataforma”.
  - Link secundário para o site da Adventure Labs.
- `app/dashboard/layout.tsx`
  - Layout de sidebar com:
    - Logo/título “Lidera Space”.
    - Link “Início” (dashboard).
    - Botão “Sair” que chama a Server Action de logout.

---

## Visões do dashboard (admin x aluno)

- **Gestão de Programas** — Aparece quando o usuário tem `role = 'admin'` na tabela de perfil (`space_users` ou `users`). Mostra tabela de programas, botão "Novo Programa" e links para módulos/aulas. Dados vêm de `getPrograms()`.
- **Meus Programas** — Aparece quando o usuário tem `role = 'aluno'` (ou qualquer outro valor). Mostra cards dos programas disponíveis e links para `/dashboard/courses/[id]`. Dados vêm de `listStudentPrograms()`.

Se uma conta que deveria ter acesso total vê "Meus Programas" vazio, verifique: (1) se a tabela de perfil (`space_users` ou `users`) tem `role = 'admin'` para esse usuário (ver passo 4 acima); (2) se o seed mínimo de conteúdo foi executado (passo 5); (3) se as migrations de RLS foram aplicadas (init_schema + rls_authenticated_read, ou space_tables_prefix).

---

## Como Rodar Localmente

Pré‑requisitos:
- Node.js 20+
- Conta Supabase e um projeto configurado

1. Instalar dependências:
   ```bash
   npm install
   ```

2. Configurar variáveis de ambiente em `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. Garantir schema e RLS:
   - **Cenário com prefixo (recomendado para Lidera):** Execute `supabase/migrations/20260311100000_space_tables_prefix.sql` no SQL Editor do projeto Supabase do cliente. Ela cria/renomeia tabelas para `space_*` e aplica RLS.
   - **Cenário sem prefixo:** Execute `20260301195140_init_schema.sql` e depois `20260304120000_rls_authenticated_read.sql` (e altere o código para usar tabelas sem prefixo).

4. Criar usuários iniciais e definir admin (conta com acesso total):
   - Crie usuários em `auth.users` pelo painel do Supabase (Authentication → Users). O trigger insere na tabela de perfil (`space_users` ou `users`) com `role = 'aluno'`.
   - Para dar **acesso total** (painel de gestão de programas), promova um usuário a admin:
     - **Opção A — seed por e-mail:** Edite `supabase/seeds/seed_admin.sql`, substitua `admin@seu-dominio.com` pelo e-mail desejado e execute no SQL Editor ou:  
       `supabase db execute --file supabase/seeds/seed_admin.sql`  
       (O seed usa `space_users` se você estiver no cenário com prefixo.)
     - **Opção B — manual:**  
       `UPDATE public.space_users SET role = 'admin' WHERE email = 'admin@seu-dominio.com';`  
       (ou `public.users` se sem prefixo.)

5. Seed mínimo de conteúdo (programas para exibir no dashboard):
   - Sem esse seed, **Meus Programas** e **Gestão de Programas** ficam vazios. Execute uma vez no SQL Editor ou:  
     `supabase db execute --file supabase/seeds/seed_minimo.sql`  
   - O arquivo está em `supabase/seeds/seed_minimo.sql` (programa + módulo + aula de exemplo).

6. Subir o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:3000`.

---

## O que já está pronto no MVP

- Autenticação com Supabase (login/logout) e proteção de rotas via middleware.
- Modelo de dados completo no Supabase com RLS por usuário e role.
- Painel admin para:
  - Listar programas.
  - Criar programas, módulos e aulas.
- Área do aluno para:
  - Listar programas disponíveis.
  - Navegar por módulos e aulas.
  - Assistir aula (iframe), acessar material externo.
  - Criar/editar anotações por aula.
  - Marcar aula como concluída.
- Home page mínima alinhada com o produto.

---

## Backlog recomendado (próximos passos)

1. **Edição/remoção de conteúdo (admin)**
   - Permitir editar título/descrição de programas, módulos e aulas.
   - Permitir reordenar módulos e aulas.

2. **Melhorias de UX para alunos**
   - Indicadores de progresso por programa/módulo.
   - Estados de loading/skeleton nas telas de dashboard, curso e aula.

3. **Observabilidade e testes**
   - Testes E2E (Playwright/Cypress) cobrindo:
     - Login admin → criação de programa/módulo/aula.
     - Login aluno → consumo de conteúdo, notas e progresso.

4. **Multi-tenant avançado (futuro)**
   - Hoje o isolamento é por projeto Supabase (um projeto por cliente).
   - Se for necessário multi-tenant num único banco:
     - Adicionar `tenant_id` nas tabelas.
     - Atualizar políticas de RLS para filtrar por `tenant_id`.
     - Injetar o tenant nas Server Actions a partir do contexto (domínio/subdomínio, etc.).

