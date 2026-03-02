import { notFound } from 'next/navigation'
import {
  getStudentProgram,
  getStudentProgramModules,
} from '@/app/actions/student'
import Link from 'next/link'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function StudentProgramPage({ params }: PageProps) {
  const { id } = await params

  const [program, modulesWithLessons] = await Promise.all([
    getStudentProgram(id),
    getStudentProgramModules(id),
  ])

  if (!program) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Programa
          </p>
          <h1 className="text-2xl font-semibold">{program.title}</h1>
          {program.description && (
            <p className="text-sm text-muted-foreground max-w-2xl">
              {program.description}
            </p>
          )}
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-primary hover:underline"
        >
          Voltar para meus programas
        </Link>
      </div>

      {modulesWithLessons.length === 0 ? (
        <p className="rounded-lg border border-dashed py-8 text-center text-muted-foreground text-sm">
          Este programa ainda não possui módulos ou aulas cadastrados.
        </p>
      ) : (
        <div className="space-y-4">
          {modulesWithLessons.map(({ module, lessons }) => (
            <section key={module.id} className="space-y-2">
              <h2 className="text-lg font-semibold">{module.title}</h2>
              {lessons.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma aula cadastrada neste módulo ainda.
                </p>
              ) : (
                <ul className="space-y-2">
                  {lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={`/dashboard/lessons/${lesson.id}`}
                        className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm text-card-foreground transition hover:border-primary/60 hover:bg-accent"
                      >
                        <span className="font-medium">{lesson.title}</span>
                        <span className="text-xs text-muted-foreground">
                          Ver aula
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

