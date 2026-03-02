## Lidera Space — Visão Geral do MVP

Lidera Space é a área de membros da Adventure Labs para desenvolvimento de líderes em redes de escolas.  
Modelo: **SaaS B2B2C**, onde cada cliente possui seu próprio projeto Supabase (isolamento por projeto, não por `tenant_id`).

### Stack
- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS, shadcn/ui.
- **Backend/Auth/DB**: Supabase (`@supabase/ssr`), PostgreSQL, RLS habilitado em todas as tabelas.
- **Infra**: pensada para rodar em Vercel + Supabase.

---

## Arquitetura de Domínio

Hierarquia de conteúdo:
- `programs` → Programas (ex.: Programa de Liderança)
- `modules` → Módulos dentro de um programa
- `lessons` → Aulas dentro de um módulo
- `notes` → Anotações em texto por aula e por aluno
- `progress` → Progresso (checkbox de conclusão) por aula e por aluno

Tabelas definidas em `supabase/migrations/20260301195140_init_schema.sql`, com:
- Trigger `handle_new_user` para popular `public.users` a partir de `auth.users`.
- RLS ativado em todas as tabelas e políticas por `role` (`admin` x `aluno`) e `user_id`.

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
    - Busca o perfil em `public.users` e decide entre visão **admin** ou **aluno**.
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
   - Execute a migration em `supabase/migrations/20260301195140_init_schema.sql` no projeto Supabase correspondente.

4. Criar usuários iniciais:
   - Crie usuários em `auth.users` pelo painel do Supabase (Authentication → Users).
   - Garanta que `public.users` tenha pelo menos:
     - Um admin:
       ```sql
       insert into public.users (id, email, role)
       values ('ID_DO_AUTH_ADMIN', 'admin@seu-dominio.com', 'admin')
       on conflict (id) do update set role = 'admin';
       ```
     - (Opcional) um aluno:
       ```sql
       insert into public.users (id, email, role)
       values ('ID_DO_AUTH_ALUNO', 'aluno@seu-dominio.com', 'aluno')
       on conflict (id) do update set role = 'aluno';
       ```

5. Seed mínimo de conteúdo (opcional, para testes rápidos):
   ```sql
   insert into public.programs (id, title, description) values (
     '00000000-0000-0000-0000-000000000001',
     'Programa de Liderança',
     'Formação em liderança para gestores de escola.'
   ) on conflict (id) do nothing;

   insert into public.modules (id, program_id, title, "order") values (
     '00000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000001',
     'Módulo 1 - Fundamentos',
     1
   ) on conflict (id) do nothing;

   insert into public.lessons (id, module_id, title, video_url, material_url, "order") values (
     '00000000-0000-0000-0000-000000000003',
     '00000000-0000-0000-0000-000000000002',
     'Aula 1 - Introdução à Liderança',
     'https://www.youtube.com/embed/dQw4w9WgXcQ',
     'https://drive.google.com',
     1
   ) on conflict (id) do nothing;
   ```

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

