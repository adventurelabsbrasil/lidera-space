'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  saveLessonNote,
  toggleLessonProgress,
  type LessonDetail,
  type SaveNoteResult,
  type ToggleProgressResult,
} from '@/app/actions/student'
import { Button } from '@/components/ui/button'

type LessonViewProps = {
  detail: LessonDetail
}

function NoteSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar anotação'}
    </Button>
  )
}

function ProgressSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? 'Atualizando...' : 'Marcar como concluída'}
    </Button>
  )
}

export function LessonView({ detail }: LessonViewProps) {
  const [noteState, noteFormAction] = useActionState<SaveNoteResult | null, FormData>(
    saveLessonNote,
    null
  )
  const [progressState, progressFormAction] = useActionState<
    ToggleProgressResult | null,
    FormData
  >(toggleLessonProgress, null)

  const [completed, setCompleted] = useState(detail.completed)

  const [_, wrappedProgressFormAction] = useActionState<
    ToggleProgressResult | null,
    FormData
  >(async (prev, formData) => {
    const result = await toggleLessonProgress(prev, formData)
    if (!result.error) {
      setCompleted((prevCompleted) => !prevCompleted)
    }
    return result
  }, null)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Aula
        </p>
        <h1 className="text-2xl font-semibold">{detail.lesson.title}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="space-y-4">
          {detail.lesson.video_url ? (
            <div className="aspect-video overflow-hidden rounded-lg border bg-black">
              <iframe
                src={detail.lesson.video_url}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Nenhum vídeo cadastrado para esta aula.
            </p>
          )}

          {detail.lesson.material_url && (
            <a
              href={detail.lesson.material_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Acessar material de apoio
            </a>
          )}
        </section>

        <section className="space-y-6">
          <div className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Progresso</h2>
              <form action={wrappedProgressFormAction}>
                <input type="hidden" name="lessonId" value={detail.lesson.id} />
                <ProgressSubmitButton />
              </form>
            </div>
            <p className="text-sm text-muted-foreground">
              Status:{' '}
              <span className="font-medium">
                {completed ? 'Concluída' : 'Em andamento'}
              </span>
            </p>
            {progressState?.error && (
              <p className="text-xs text-destructive" role="alert">
                {progressState.error}
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
            <h2 className="text-sm font-semibold">Anotações</h2>
            <form action={noteFormAction} className="space-y-3">
              <input type="hidden" name="lessonId" value={detail.lesson.id} />
              <textarea
                name="content"
                defaultValue={detail.note}
                placeholder="Escreva aqui suas anotações sobre esta aula..."
                className="min-h-[160px] w-full resize-y rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {noteState?.error && (
                <p className="text-xs text-destructive" role="alert">
                  {noteState.error}
                </p>
              )}
              <NoteSubmitButton />
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}

