# Clerk — legado (isolamento)

**Lidera Flow (PLL):** slot reservado em `apps/clientes/lidera/flow/` (`@cliente/lidera-flow`). Este arquivo documenta o app **Space** (área de membros).

**Status (2026-03):** Este app **não** declara `@clerk/nextjs` nem variáveis `CLERK_*` no código-fonte atual.

Se no futuro algum PR reintroduzir Clerk:

- Liste aqui layout raiz, `ClerkProvider`, e rotas que chamam `auth()`.
- Alinhe com o padrão do Admin Adventure Labs: **Supabase Auth** + RLS + `ADMIN_ALLOWED_EMAILS` onde aplicável.
