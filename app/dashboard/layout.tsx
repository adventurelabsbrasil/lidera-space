import Link from 'next/link'
import { LogOut, LayoutDashboard, BookOpen } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/actions/auth'
import { getPrograms } from '@/app/actions/admin'
import { listStudentPrograms } from '@/app/actions/student'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('space_users')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()
  const role = profile?.role ?? 'aluno'
  const isAdmin = role === 'admin'

  const programs = user
    ? isAdmin
      ? await getPrograms()
      : await listStudentPrograms()
    : []

  const programHref = (id: string) =>
    isAdmin ? `/dashboard/programs/${id}` : `/dashboard/courses/${id}`

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="flex w-56 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-14 items-center gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
          <LayoutDashboard className="size-5 shrink-0 text-zinc-600 dark:text-zinc-400" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            Lidera Space
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Início
          </Link>
          {programs.length > 0 && (
            <div className="mt-2 space-y-0.5">
              <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Programas
              </p>
              {programs.map((program) => (
                <Link
                  key={program.id}
                  href={programHref(program.id)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <BookOpen className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                  <span className="truncate">{program.title}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              className="w-full justify-start gap-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <LogOut className="size-4" />
              Sair
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
