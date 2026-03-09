# Arquitetura Space (Lidera Space)

- **Modelo:** Plataforma de Área de Membros SaaS (B2B2C). Supabase do cliente (ex.: Lidera) é exclusivo para este app; dados ficam no projeto do cliente.
- **Banco:** Tabelas com prefixo `space_*`: `space_users`, `space_programs`, `space_modules`, `space_lessons`, `space_notes`, `space_progress`. RLS por `space_users.role` (admin/aluno). Migração: `supabase/migrations/20260311100000_space_tables_prefix.sql`. Ver [COMO_FUNCIONA_BANCO_E_ROLES.md](COMO_FUNCIONA_BANCO_E_ROLES.md).
- **Hierarquia de Dados:** Programas → Módulos → Aulas.
- **Mídia:** Aulas usam iframe do YouTube e links externos do Google Drive para materiais.
- **Engajamento:** Alunos têm anotações (`space_notes`) por aula e progresso (`space_progress`).
- **Acesso:** App roda em lideraspace.adventurelabs.com.br; env `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` apontam para o projeto Supabase do cliente.
- **Organizações:** No app Space, criação e gestão de organizações são responsabilidade do cliente que comprou o Space (self-service); escopo exclusivo deste app (ver doc § 7).