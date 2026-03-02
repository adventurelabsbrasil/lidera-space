'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export type Program = {
  id: string
  title: string
  description: string | null
  created_at: string
  updated_at: string
}

export type CreateProgramResult = { error?: string; success?: boolean }

export type Module = {
  id: string
  program_id: string
  title: string
  order: number
  created_at: string
  updated_at: string
}

export type Lesson = {
  id: string
  module_id: string
  title: string
  video_url: string | null
  material_url: string | null
  order: number
  created_at: string
  updated_at: string
}

export type CreateModuleResult = { error?: string; success?: boolean }
export type CreateLessonResult = { error?: string; success?: boolean }

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase: null, error: 'Não autenticado' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { supabase: null, error: 'Acesso negado. Apenas administradores.' }
  }

  return { supabase, error: null }
}

/**
 * Lista todos os programas. Retorna [] se o usuário não for admin.
 */
export async function getPrograms(): Promise<Program[]> {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return []

  const { data, error: queryError } = await supabase
    .from('programs')
    .select('id, title, description, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (queryError) return []
  return (data ?? []) as Program[]
}

/**
 * Cria um programa. Verifica role admin antes. Para uso com useActionState: (prev, formData) => ...
 */
export async function createProgram(
  _prev: CreateProgramResult | null,
  formData: FormData
): Promise<CreateProgramResult> {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) {
    return { error: error ?? 'Acesso negado.' }
  }

  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null

  if (!title) {
    return { error: 'Título é obrigatório.' }
  }

  const { error: insertError } = await supabase.from('programs').insert({
    title,
    description: description || null,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Busca um programa por ID. Retorna null se não for admin ou não existir.
 */
export async function getProgramById(id: string): Promise<Program | null> {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return null

  const { data, error: queryError } = await supabase
    .from('programs')
    .select('id, title, description, created_at, updated_at')
    .eq('id', id)
    .single()

  if (queryError || !data) return null
  return data as Program
}

/**
 * Lista módulos de um programa. Retorna [] se não for admin.
 */
export async function getModulesByProgram(programId: string): Promise<Module[]> {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return []

  const { data, error: queryError } = await supabase
    .from('modules')
    .select('id, program_id, title, order, created_at, updated_at')
    .eq('program_id', programId)
    .order('order', { ascending: true })

  if (queryError) return []
  return (data ?? []) as Module[]
}

/**
 * Lista aulas de um módulo. Retorna [] se não for admin.
 */
export async function getLessonsByModule(moduleId: string): Promise<Lesson[]> {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return []

  const { data, error: queryError } = await supabase
    .from('lessons')
    .select('id, module_id, title, video_url, material_url, order, created_at, updated_at')
    .eq('module_id', moduleId)
    .order('order', { ascending: true })

  if (queryError) return []
  return (data ?? []) as Lesson[]
}

/**
 * Cria um módulo. programId deve vir em formData. Para useActionState: (prev, formData) => ...
 */
export async function createModule(
  _prev: CreateModuleResult | null,
  formData: FormData
): Promise<CreateModuleResult> {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error: error ?? 'Acesso negado.' }

  const programId = formData.get('programId') as string | null
  const title = (formData.get('title') as string)?.trim()

  if (!programId || !title) {
    return { error: 'Programa e título são obrigatórios.' }
  }

  const { error: insertError } = await supabase.from('modules').insert({
    program_id: programId,
    title,
    order: 0,
  })

  if (insertError) return { error: insertError.message }

  revalidatePath(`/dashboard/programs/${programId}`)
  return { success: true }
}

/**
 * Cria uma aula. moduleId e programId (para revalidate) devem vir em formData. Para useActionState: (prev, formData) => ...
 */
export async function createLesson(
  _prev: CreateLessonResult | null,
  formData: FormData
): Promise<CreateLessonResult> {
  const { supabase, error } = await requireAdmin()
  if (error || !supabase) return { error: error ?? 'Acesso negado.' }

  const moduleId = formData.get('moduleId') as string | null
  const programId = formData.get('programId') as string | null
  const title = (formData.get('title') as string)?.trim()
  const video_url = (formData.get('video_url') as string)?.trim() || null
  const material_url = (formData.get('material_url') as string)?.trim() || null

  if (!moduleId || !title) {
    return { error: 'Módulo e título são obrigatórios.' }
  }

  const { error: insertError } = await supabase.from('lessons').insert({
    module_id: moduleId,
    title,
    video_url: video_url || null,
    material_url: material_url || null,
    order: 0,
  })

  if (insertError) return { error: insertError.message }

  if (programId) {
    revalidatePath(`/dashboard/programs/${programId}`)
  }
  return { success: true }
}
