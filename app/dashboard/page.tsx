import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { getPrograms } from '@/app/actions/admin'
import { listStudentPrograms } from '@/app/actions/student'
import { AdminView } from '@/components/dashboard/admin-view'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('space_users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'aluno'

  if (role === 'admin') {
    const programs = await getPrograms()
    return <AdminView programs={programs} />
  }

  const studentPrograms = await listStudentPrograms()

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Meus Programas</h1>
        <p className="text-sm text-muted-foreground">
          Selecione um programa para acessar os módulos e aulas.
        </p>
      </header>

      {studentPrograms.length === 0 ? (
        <p className="rounded-lg border border-dashed py-8 text-center text-muted-foreground text-sm">
          Nenhum programa disponível no momento. Fale com o time responsável pela
          plataforma.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {studentPrograms.map((program) => (
            <li
              key={program.id}
              className="group rounded-lg border bg-card p-4 text-card-foreground transition hover:border-primary/60 hover:shadow-sm"
            >
              <Link href={`/dashboard/courses/${program.id}`} className="block space-y-2">
                <h2 className="text-base font-semibold group-hover:text-primary">
                  {program.title}
                </h2>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {program.description ?? 'Programa sem descrição cadastrada.'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
