'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, GripVertical, Plus, Video, FileText, Wrench } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  createModule,
  createLesson,
  updateModuleOrder,
  updateLessonOrder,
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

function SortableLessonRow({ lesson }: { lesson: Lesson; programId: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? 'opacity-50'
          : 'flex items-center gap-2 rounded-md border bg-muted/30 transition'
      }
    >
      <button
        type="button"
        className="cursor-grab touch-none p-2 text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Arrastar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <Link
        href={`/dashboard/lessons/${lesson.id}`}
        className="flex flex-1 items-center gap-2 px-2 py-2 text-sm transition hover:border-primary/60 hover:bg-accent"
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
        <span className="ml-auto text-xs text-muted-foreground">Ver aula</span>
      </Link>
    </li>
  )
}

function SortableModuleItem({
  module,
  children,
}: {
  module: Module
  children: React.ReactNode
  programId?: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : undefined}>
      <AccordionItem value={module.id}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
            aria-label="Arrastar para reordenar módulo"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
          <AccordionTrigger className="flex-1 hover:no-underline">
            {module.title}
          </AccordionTrigger>
        </div>
        <AccordionContent>{children}</AccordionContent>
      </AccordionItem>
    </div>
  )
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
  modulesWithLessons: initialModulesWithLessons,
}: ProgramDetailViewProps) {
  const router = useRouter()
  const [modulesWithLessons, setModulesWithLessons] = useState(
    initialModulesWithLessons
  )
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  )

  useEffect(() => {
    setModulesWithLessons(initialModulesWithLessons)
  }, [initialModulesWithLessons])

  useEffect(() => {
    if (moduleState?.success) {
      setModuleDialogOpen(false)
      router.refresh()
    }
  }, [moduleState?.success, router])

  useEffect(() => {
    if (lessonState?.success) {
      setLessonDialogOpen(false)
      setLessonModuleId(null)
      router.refresh()
    }
  }, [lessonState?.success, router])

  const openNewLessonDialog = (moduleId: string) => {
    setLessonModuleId(moduleId)
    setLessonDialogOpen(true)
  }

  const moduleIds = modulesWithLessons.map((m) => m.module.id)
  const allLessonIds = modulesWithLessons.flatMap((m) => m.lessons.map((l) => l.id))

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (moduleIds.includes(activeId)) {
      const oldIndex = moduleIds.indexOf(activeId)
      const newIndex = moduleIds.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(modulesWithLessons, oldIndex, newIndex)
      setModulesWithLessons(reordered)
      const result = await updateModuleOrder(
        program.id,
        reordered.map((m) => m.module.id)
      )
      if (!result.error) router.refresh()
      return
    }

    const moduleIndex = modulesWithLessons.findIndex((m) =>
      m.lessons.some((l) => l.id === activeId)
    )
    if (moduleIndex === -1) return
    const row = modulesWithLessons[moduleIndex]
    if (!row.lessons.some((l) => l.id === overId)) return
    const lessonIds = row.lessons.map((l) => l.id)
    const oldIdx = lessonIds.indexOf(activeId)
    const newIdx = lessonIds.indexOf(overId)
    if (oldIdx === -1 || newIdx === -1) return
    const newLessons = arrayMove(row.lessons, oldIdx, newIdx)
    const updated = [...modulesWithLessons]
    updated[moduleIndex] = { ...row, lessons: newLessons }
    setModulesWithLessons(updated)
    const result = await updateLessonOrder(
      row.module.id,
      newLessons.map((l) => l.id),
      program.id
    )
    if (!result.error) router.refresh()
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

      {program.title === 'Lucro e Liberdade' && (
        <Link
          href={`/dashboard/courses/${program.id}/ferramentas`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          <Wrench className="size-4" />
          Ferramentas de Gestão
        </Link>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <Accordion type="multiple" className="w-full">
          {modulesWithLessons.length === 0 ? (
            <p className="rounded-lg border border-dashed py-8 text-center text-muted-foreground text-sm">
              Nenhum módulo ainda. Clique em &quot;Novo Módulo&quot; para começar.
            </p>
          ) : (
            <SortableContext
              items={moduleIds}
              strategy={verticalListSortingStrategy}
            >
              {modulesWithLessons.map(({ module, lessons }) => (
                <SortableModuleItem
                  key={module.id}
                  module={module}
                  programId={program.id}
                >
                  <SortableContext
                    items={lessons.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-2">
                      {lessons.map((lesson) => (
                        <SortableLessonRow
                          key={lesson.id}
                          lesson={lesson}
                          programId={program.id}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-2"
                    onClick={() => openNewLessonDialog(module.id)}
                  >
                    <Plus className="size-4" />
                    Nova Aula
                  </Button>
                </SortableModuleItem>
              ))}
            </SortableContext>
          )}
        </Accordion>
      </DndContext>

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
