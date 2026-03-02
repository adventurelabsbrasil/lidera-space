'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export type LoginResult = { error?: string }

/**
 * Server Action: login com email e senha.
 * Redireciona para /dashboard em caso de sucesso.
 */
export async function login(formData: FormData): Promise<LoginResult> {
  const email = formData.get('email') as string | null
  const password = formData.get('password') as string | null

  if (!email?.trim() || !password) {
    return { error: 'E-mail e senha são obrigatórios.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

/**
 * Server Action: logout (encerra sessão e redireciona para /login).
 */
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
