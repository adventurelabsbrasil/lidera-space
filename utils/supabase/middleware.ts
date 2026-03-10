import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Atualiza a sessão Supabase no middleware: lê cookies da request,
 * refresha o token se necessário e grava cookies na response.
 * Deve ser chamado pelo middleware.ts da raiz.
 * Em caso de erro (env ausente, rede, etc.), retorna response sem user para evitar 500.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response, user: null, role: 'aluno' }
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    let role: 'aluno' | 'admin' = 'aluno'
    if (user) {
      const { data: profile } = await supabase
        .from('space_users')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role === 'admin') role = 'admin'
    }

    return { response, user, role }
  } catch {
    return { response, user: null, role: 'aluno' }
  }
}
