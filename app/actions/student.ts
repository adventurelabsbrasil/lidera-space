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

export type StudentModuleWithLessons = {
  module: Module
  lessons: Lesson[]
}

export type LessonDetail = {
  lesson: Lesson
  note: string
  completed: boolean
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
    .from('programs')
    .select('id, title, description')
    .order('created_at', { ascending: false })

  return (data ?? []) as StudentProgramSummary[]
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
    .from('programs')
    .select('id, title, description')
    .eq('id', programId)
    .limit(1)

  const program = (data?.[0] as StudentProgramSummary | undefined) ?? null
  return program ?? null
}

/**
 * Busca módulos e aulas de um programa para o aluno.
 */
export async function getStudentProgramModules(
  programId: string
): Promise<StudentModuleWithLessons[]> {
  const { supabase, userId } = await getCurrentUserId()
  if (!supabase || !userId) return []

  const { data: modules } = await supabase
    .from('modules')
    .select('id, program_id, title, order')
    .eq('program_id', programId)
    .order('order', { ascending: true })

  if (!modules) return []

  const results: StudentModuleWithLessons[] = []

  for (const module of modules as Module[]) {
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, module_id, title, video_url, material_url, order')
      .eq('module_id', module.id)
      .order('order', { ascending: true })

    results.push({
      module,
      lessons: (lessons ?? []) as Lesson[],
    })
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
    .from('lessons')
    .select('id, module_id, title, video_url, material_url, order')
    .eq('id', lessonId)
    .limit(1)

  const lesson = (lessonRows?.[0] as Lesson | undefined) ?? null

  if (!lesson) return null

  const { data: noteRows } = await supabase
    .from('notes')
    .select('content')
    .eq('lesson_id', lessonId)
    .eq('user_id', userId)
    .limit(1)

  const noteRow = noteRows?.[0] as { content: string } | undefined

  const { data: progressRows } = await supabase
    .from('progress')
    .select('completed')
    .eq('lesson_id', lessonId)
    .eq('user_id', userId)
    .limit(1)

  const progressRow = progressRows?.[0] as { completed: boolean } | undefined

  return {
    lesson,
    note: noteRow?.content ?? '',
    completed: progressRow?.completed ?? false,
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

  const { error } = await supabase.from('notes').upsert(
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
    .from('progress')
    .select('id, completed')
    .eq('lesson_id', lessonId)
    .eq('user_id', userId)
    .limit(1)

  const existing = existingRows?.[0] as { id: string; completed: boolean } | undefined

  if (!existing) {
    const { error } = await supabase.from('progress').insert({
      user_id: userId,
      lesson_id: lessonId,
      completed: true,
    })

    if (error) {
      return { error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('progress')
      .update({ completed: !existing.completed })
      .eq('id', existing.id)

    if (error) {
      return { error: error.message }
    }
  }

  revalidatePath(`/dashboard/lessons/${lessonId}`)
  return { success: true }
}

