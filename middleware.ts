import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

/**
 * Middleware: atualiza sessão Supabase (cookies) e protege /dashboard.
 * Redireciona para /login se não autenticado ao acessar /dashboard.
 */
export async function middleware(request: NextRequest) {
  try {
    const { response, user, role } = await updateSession(request)

    const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
    const isAdminRoute =
      request.nextUrl.pathname.startsWith('/dashboard/programs/') &&
      (request.nextUrl.pathname.includes('/edit') ||
        request.nextUrl.pathname.includes('/new'))

    if (isDashboardRoute && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (isAdminRoute && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    return response
  } catch {
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
