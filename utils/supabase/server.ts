import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cria cliente Supabase para uso em Server Components, Server Actions e Route Handlers.
 * Usa cookies do Next.js para persistir e refrescar a sessão.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Chamado de Server Component; o middleware cuida do refresh da sessão.
          }
        },
      },
    }
  )
}
