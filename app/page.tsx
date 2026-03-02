import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-16 text-center dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Adventure Labs
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            Lidera Space
          </h1>
          <p className="text-balance text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            Plataforma de desenvolvimento de líderes para redes de escolas. Acesse
            seus programas, módulos e aulas em um só lugar.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={user ? '/dashboard' : '/login'}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            {user ? 'Ir para o dashboard' : 'Entrar na plataforma'}
          </Link>
          <Link
            href="https://adventurelabs.com.br"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-md border px-6 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Conhecer a Adventure Labs
          </Link>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Acesso restrito a usuários convidados. Fale com o time Adventure Labs para
          obter credenciais.
        </p>
      </div>
    </main>
  )
}

