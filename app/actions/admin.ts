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
