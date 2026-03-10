import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Check, ChevronRight, Circle } from 'lucide-react'
import {
  getStudentProgram,
  getStudentProgramModules,
} from '@/app/actions/student'

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
      <nav
        aria-label="Navegação"
        className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
      >
        <Link
          href="/dashboard"
          className="hover:text-foreground hover:underline"
        >
          Início
        </Link>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
        <span className="text-foreground font-medium">{program.title}</span>
      </nav>
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
          {(() => {
            const totalLessons = modulesWithLessons.reduce(
              (acc, { lessons }) => acc + lessons.length,
              0
            )
            const completedLessons = modulesWithLessons.reduce(
              (acc, { lessons }) =>
                acc + lessons.filter((l) => l.completed).length,
              0
            )
            const progressPct =
              totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0
            return (
              totalLessons > 0 && (
                <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Progresso do programa</span>
                    <span className="text-muted-foreground">
                      {completedLessons}/{totalLessons} aulas · {progressPct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )
            )
          })()}
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
                        className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm text-card-foreground transition hover:border-primary/60 hover:bg-accent"
                      >
                        <span className="flex items-center gap-2">
                          {lesson.completed ? (
                            <Check
                              className="size-4 shrink-0 text-primary"
                              aria-label="Concluída"
                            />
                          ) : (
                            <Circle
                              className="size-4 shrink-0 text-muted-foreground"
                              aria-label="Não concluída"
                            />
                          )}
                          <span className="font-medium">{lesson.title}</span>
                        </span>
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

