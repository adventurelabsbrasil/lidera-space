'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { ArrowLeft, Plus, Video, FileText } from 'lucide-react'
import {
  createModule,
  createLesson,
  type Program,
  type Module,
  type Lesson,
  type CreateModuleResult,
  type CreateLessonResult,
} from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

type ModuleWithLessons = {
  module: Module
  lessons: Lesson[]
}

type ProgramDetailViewProps = {
  program: Program
  modulesWithLessons: ModuleWithLessons[]
}

function ModuleSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Criando...' : 'Criar módulo'}
    </Button>
  )
}

function LessonSubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Criando...' : 'Criar aula'}
    </Button>
  )
}

export function ProgramDetailView({
  program,
  modulesWithLessons,
}: ProgramDetailViewProps) {
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false)
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false)
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null)

  const [moduleState, moduleFormAction] = useActionState<CreateModuleResult | null, FormData>(
    createModule,
    null
  )
  const [lessonState, lessonFormAction] = useActionState<CreateLessonResult | null, FormData>(
    createLesson,
    null
  )

  useEffect(() => {
    if (moduleState?.success) setModuleDialogOpen(false)
  }, [moduleState?.success])

  useEffect(() => {
    if (lessonState?.success) {
      setLessonDialogOpen(false)
      setLessonModuleId(null)
    }
  }, [lessonState?.success])

  const openNewLessonDialog = (moduleId: string) => {
    setLessonModuleId(moduleId)
    setLessonDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard" aria-label="Voltar">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">{program.title}</h1>
        </div>
        <Button onClick={() => setModuleDialogOpen(true)} className="gap-2 shrink-0">
          <Plus className="size-4" />
          Novo Módulo
        </Button>
      </div>

      {program.description && (
        <p className="text-muted-foreground text-sm">{program.description}</p>
      )}

      <Accordion type="multiple" className="w-full">
        {modulesWithLessons.length === 0 ? (
          <p className="rounded-lg border border-dashed py-8 text-center text-muted-foreground text-sm">
            Nenhum módulo ainda. Clique em &quot;Novo Módulo&quot; para começar.
          </p>
        ) : (
          modulesWithLessons.map(({ module, lessons }) => (
            <AccordionItem key={module.id} value={module.id}>
              <AccordionTrigger>{module.title}</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                    >
                      {lesson.video_url ? (
                        <Video className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <span className="size-4 shrink-0" />
                      )}
                      {lesson.material_url && (
                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="font-medium">{lesson.title}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2"
                  onClick={() => openNewLessonDialog(module.id)}
                >
                  <Plus className="size-4" />
                  Nova Aula
                </Button>
              </AccordionContent>
            </AccordionItem>
          ))
        )}
      </Accordion>

      {/* Dialog Novo Módulo */}
      <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Módulo</DialogTitle>
            <DialogDescription>
              Informe o título do novo módulo deste programa.
            </DialogDescription>
          </DialogHeader>
          <form action={moduleFormAction} className="grid gap-4">
            <input type="hidden" name="programId" value={program.id} />
            <div className="grid gap-2">
              <Label htmlFor="module-title">Título</Label>
              <Input
                id="module-title"
                name="title"
                placeholder="Ex: Módulo 1 - Introdução"
                required
              />
            </div>
            {moduleState?.error && (
              <p className="text-destructive text-sm" role="alert">
                {moduleState.error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModuleDialogOpen(false)}
              >
                Cancelar
              </Button>
              <ModuleSubmitButton />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Aula */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Aula</DialogTitle>
            <DialogDescription>
              Preencha os dados da nova aula. Vídeo e material são opcionais.
            </DialogDescription>
          </DialogHeader>
          <form action={lessonFormAction} className="grid gap-4">
            <input type="hidden" name="moduleId" value={lessonModuleId ?? ''} />
            <input type="hidden" name="programId" value={program.id} />
            <div className="grid gap-2">
              <Label htmlFor="lesson-title">Título</Label>
              <Input
                id="lesson-title"
                name="title"
                placeholder="Ex: Aula 1 - Conceitos iniciais"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lesson-video">URL do vídeo (YouTube, etc.)</Label>
              <Input
                id="lesson-video"
                name="video_url"
                type="url"
                placeholder="https://..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lesson-material">URL do material (Google Drive, etc.)</Label>
              <Input
                id="lesson-material"
                name="material_url"
                type="url"
                placeholder="https://..."
              />
            </div>
            {lessonState?.error && (
              <p className="text-destructive text-sm" role="alert">
                {lessonState.error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setLessonDialogOpen(false)
                  setLessonModuleId(null)
                }}
              >
                Cancelar
              </Button>
              <LessonSubmitButton />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
