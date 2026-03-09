# Space — Tabelas e RLS no Supabase

Referência rápida: tabelas usadas pelo app e onde estão no código. Para schema completo, usuários, roles, setup e organizações, veja [COMO_FUNCIONA_BANCO_E_ROLES.md](COMO_FUNCIONA_BANCO_E_ROLES.md).

---

## Cenário em uso (Lidera)

O app está configurado para tabelas **com prefixo `space_*`** (projeto Supabase do cliente com a migração `20260311100000_space_tables_prefix.sql` aplicada).

| Tabela | Uso no app |
|--------|------------|
| `space_users` | Perfil (role: admin/aluno). Middleware, requireAdmin(), listagem e atualização de role. |
| `space_programs` | Listagem (aluno e admin), criação (admin). |
| `space_modules` | Módulos por programa; criação (admin). |
| `space_lessons` | Aulas por módulo; criação (admin). |
| `space_notes` | Notas do aluno por aula; leitura/upsert pelo dono. |
| `space_progress` | Conclusão por aula; leitura/insert/update pelo dono. |

---

## Onde cada tabela é usada no código

- **space_users:** `utils/supabase/middleware.ts`, `app/actions/admin.ts` (requireAdmin, getUsers, updateUserRole), `app/dashboard/page.tsx`, `app/dashboard/admin/users/page.tsx`
- **space_programs:** `app/actions/student.ts`, `app/actions/admin.ts`
- **space_modules:** `app/actions/student.ts`, `app/actions/admin.ts`
- **space_lessons:** `app/actions/student.ts`, `app/actions/admin.ts`
- **space_notes:** `app/actions/student.ts`
- **space_progress:** `app/actions/student.ts`

---

## RLS (resumo)

Tabela de perfil: usuário vê o próprio perfil; admin vê todos e pode atualizar roles. Programs/modules/lessons: leitura para `authenticated`, admin com ALL. Notes/progress: usuário ALL nos próprios registros; admin SELECT em todos. Detalhes nas migrações em `supabase/migrations/`.
