'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

type Program = {
  id: string
  title: string
  description: string | null
}

type Module = {
  id: string
  program_id: string
  title: string
  order: number
}

type Lesson = {
  id: string
  module_id: string
  title: string
  video_url: string | null
  material_url: string | null
  order: number
}

export type StudentProgramSummary = Program

export type StudentProgramWithProgress = StudentProgramSummary & {
  completedCount: number
  totalCount: number
}

export type LessonWithCompleted = Lesson & { completed: boolean }

export type StudentModuleWithLessons = {
  module: Module
  lessons: LessonWithCompleted[]
}

export type LessonBreadcrumb = {
  id: string
  title: string
}

export type LessonDetail = {
  lesson: Lesson
  note: string
  completed: boolean
  program: LessonBreadcrumb | null
  module: LessonBreadcrumb | null
  prevLessonId: string | null
  nextLessonId: string | null
}

export type SaveNoteResult = { error?: string; success?: boolean }
export type ToggleProgressResult = { error?: string; success?: boolean }

async function getCurrentUserId() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return { supabase, userId: null as string | null }
  return { supabase, userId: user.id as string }
}

/**
 * Lista todos os programas disponíveis para o aluno.
 * RLS garante que apenas dados permitidos sejam retornados.
 */
export async function listStudentPrograms(): Promise<StudentProgramSummary[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('space_programs')
    .select('id, title, description')
    .order('created_at', { ascending: false })

  return (data ?? []) as StudentProgramSummary[]
}

/**
 * Lista programas com contagem de progresso (aulas concluídas / total) para o aluno.
 */
export async function listStudentProgramsWithProgress(): Promise<
  StudentProgramWithProgress[]
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: programs } = await supabase
    .from('space_programs')
    .select('id, title, description')
    .order('created_at', { ascending: false })
  if (!programs?.length) return []

  const programIds = programs.map((p) => p.id)
  const { data: modules } = await supabase
    .from('space_modules')
    .select('id, program_id')
    .in('program_id', programIds)
  const moduleList = modules ?? []
  const moduleIds = moduleList.map((m) => m.id)
  const { data: lessons } = await supabase
    .from('space_lessons')
    .select('id, module_id')
    .in('module_id', moduleIds)
  const lessonList = lessons ?? []

  const totalByProgram = new Map<string, number>()
  for (const p of programs) {
    const programModuleIds = new Set(
      moduleList.filter((m) => m.program_id === p.id).map((m) => m.id)
    )
    const count = lessonList.filter((l) => programModuleIds.has(l.module_id)).length
    totalByProgram.set(p.id, count)
  }

  const { data: progress } = await supabase
    .from('space_progress')
    .select('lesson_id')
    .eq('user_id', user.id)
    .eq('completed', true)
  const completedLessonIds = new Set(progress?.map((p) => p.lesson_id) ?? [])
  const completedByProgram = new Map<string, number>()
  for (const p of programs) {
    const programModuleIds = new Set(
      moduleList.filter((m) => m.program_id === p.id).map((m) => m.id)
    )
    const programLessons = lessonList.filter((l) => programModuleIds.has(l.module_id))
    const count = programLessons.filter((l) => completedLessonIds.has(l.id)).length
    completedByProgram.set(p.id, count)
  }

  return (programs as StudentProgramSummary[]).map((p) => ({
    ...p,
    completedCount: completedByProgram.get(p.id) ?? 0,
    totalCount: totalByProgram.get(p.id) ?? 0,
  }))
}

/**
 * Busca um programa específico para o aluno.
 */
export async function getStudentProgram(
  programId: string
): Promise<StudentProgramSummary | null> {
  const { supabase, userId } = await getCurrentUserId()
  if (!supabase || !userId) return null

  const { data } = await supabase
    .from('space_programs')
    .select('id, title, description')
    .eq('id', programId)
    .limit(1)

  const program = (data?.[0] as StudentProgramSummary | undefined) ?? null
  return program ?? null
}

/**
 * Busca módulos e aulas de um programa para o aluno, com status de conclusão por aula.
 */
export async function getStudentProgramModules(
  programId: string
): Promise<StudentModuleWithLessons[]> {
  const { supabase, userId } = await getCurrentUserId()
  if (!supabase || !userId) return []

  const { data: modules } = await supabase
    .from('space_modules')
    .select('id, program_id, title, order')
    .eq('program_id', programId)
    .order('order', { ascending: true })

  if (!modules) return []

  const results: StudentModuleWithLessons[] = []
  const allLessonIds: string[] = []

  for (const module of modules as Module[]) {
    const { data: lessons } = await supabase
      .from('space_lessons')
      .select('id, module_id, title, video_url, material_url, order')
      .eq('module_id', module.id)
      .order('order', { ascending: true })

    const lessonList = (lessons ?? []) as Lesson[]
    lessonList.forEach((l) => allLessonIds.push(l.id))
    results.push({
      module,
      lessons: lessonList.map((l) => ({ ...l, completed: false })),
    })
  }

  if (allLessonIds.length === 0) return results

  const { data: progressRows } = await supabase
    .from('space_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('completed', true)
    .in('lesson_id', allLessonIds)
  const completedSet = new Set(
    (progressRows ?? []).map((r: { lesson_id: string }) => r.lesson_id)
  )

  for (const row of results) {
    row.lessons = row.lessons.map((l) => ({
      ...l,
      completed: completedSet.has(l.id),
    }))
  }

  return results
}

/**
 * Detalhe de uma aula para o aluno, incluindo nota e progresso.
 */
export async function getLessonDetail(lessonId: string): Promise<LessonDetail | null> {
  const { supabase, userId } = await getCurrentUserId()
  if (!supabase || !userId) return null

  const { data: lessonRows } = await supabase
    .from('space_lessons')
    .select('id, module_id, title, video_url, material_url, order')
    .eq('id', lessonId)
    .limit(1)

  const lesson = (lessonRows?.[0] as Lesson | undefined) ?? null

  if (!lesson) return null

  const { data: noteRows } = await supabase
    .from('space_notes')
    .select('content')
    .eq('lesson_id', lessonId)
    .eq('user_id', userId)
    .limit(1)

  const noteRow = noteRows?.[0] as { content: string } | undefined

  const { data: progressRows } = await supabase
    .from('space_progress')
    .select('completed')
    .eq('lesson_id', lessonId)
    .eq('user_id', userId)
    .limit(1)

  const progressRow = progressRows?.[0] as { completed: boolean } | undefined

  const { data: moduleRow } = await supabase
    .from('space_modules')
    .select('id, title, program_id')
    .eq('id', lesson.module_id)
    .limit(1)
    .single()

  const module = moduleRow as { id: string; title: string; program_id: string } | null
  let program: LessonBreadcrumb | null = null
  if (module) {
    const { data: programRow } = await supabase
      .from('space_programs')
      .select('id, title')
      .eq('id', module.program_id)
      .limit(1)
      .single()
    program = programRow
      ? { id: (programRow as { id: string; title: string }).id, title: (programRow as { id: string; title: string }).title }
      : null
  }

  const { data: moduleLessons } = await supabase
    .from('space_lessons')
    .select('id')
    .eq('module_id', lesson.module_id)
    .order('order', { ascending: true })
  const orderedIds = (moduleLessons ?? []).map((r: { id: string }) => r.id)
  const currentIndex = orderedIds.indexOf(lesson.id)
  const prevLessonId =
    currentIndex > 0 ? orderedIds[currentIndex - 1] ?? null : null
  const nextLessonId =
    currentIndex >= 0 && currentIndex < orderedIds.length - 1
      ? orderedIds[currentIndex + 1] ?? null
      : null

  return {
    lesson,
    note: noteRow?.content ?? '',
    completed: progressRow?.completed ?? false,
    program: program ?? null,
    module: module ? { id: module.id, title: module.title } : null,
    prevLessonId,
    nextLessonId,
  }
}

/**
 * Salva/atualiza nota de uma aula para o aluno logado.
 */
export async function saveLessonNote(
  _prev: SaveNoteResult | null,
  formData: FormData
): Promise<SaveNoteResult> {
  const lessonId = (formData.get('lessonId') as string | null)?.trim()
  const content = (formData.get('content') as string | null) ?? ''

  const { supabase, userId } = await getCurrentUserId()
  if (!supabase || !userId) {
    return { error: 'Não autenticado.' }
  }

  if (!lessonId) {
    return { error: 'Aula inválida.' }
  }

  const { error } = await supabase.from('space_notes').upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      content,
    },
    { onConflict: 'user_id,lesson_id' }
  )

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/lessons/${lessonId}`)
  return { success: true }
}

/**
 * Alterna o progresso (concluído/não concluído) de uma aula.
 */
export async function toggleLessonProgress(
  _prev: ToggleProgressResult | null,
  formData: FormData
): Promise<ToggleProgressResult> {
  const lessonId = (formData.get('lessonId') as string | null)?.trim()

  const { supabase, userId } = await getCurrentUserId()
  if (!supabase || !userId) {
    return { error: 'Não autenticado.' }
  }

  if (!lessonId) {
    return { error: 'Aula inválida.' }
  }

  const { data: existingRows } = await supabase
    .from('space_progress')
    .select('id, completed')
    .eq('lesson_id', lessonId)
    .eq('user_id', userId)
    .limit(1)

  const existing = existingRows?.[0] as { id: string; completed: boolean } | undefined

  if (!existing) {
    const { error } = await supabase.from('space_progress').insert({
      user_id: userId,
      lesson_id: lessonId,
      completed: true,
    })

    if (error) {
      return { error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('space_progress')
      .update({ completed: !existing.completed })
      .eq('id', existing.id)

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath(`/dashboard/lessons/${lessonId}`)
  return { success: true }
}

