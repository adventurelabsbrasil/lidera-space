import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import {
  isGestaoProgram,
  getGestaoCategories,
  getGestaoSubcategories,
  listLancamentos,
  getDREMonthly,
  getDREAnnual,
} from '@/app/actions/gestao'
import { getStudentProgram } from '@/app/actions/student'
import { FerramentasView } from '@/components/gestao/ferramentas-view'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function FerramentasPage({ params }: PageProps) {
  const { id: programId } = await params

  const [program, ok] = await Promise.all([
    getStudentProgram(programId),
    isGestaoProgram(programId),
  ])

  if (!program || !ok) {
    notFound()
  }

  const [categories, subcategories, lancamentos, dreMonth, dreYear] = await Promise.all([
    getGestaoCategories(),
    getGestaoSubcategories(),
    listLancamentos(programId),
    getDREMonthly(programId, new Date().getFullYear(), new Date().getMonth() + 1),
    getDREAnnual(programId, new Date().getFullYear()),
  ])

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <nav
        aria-label="Navegação"
        className="flex flex-wrap items-center gap-1 px-1 py-2 text-sm text-slate-600 dark:text-slate-400"
      >
        <Link
          href="/dashboard"
          className="hover:text-slate-900 hover:underline dark:hover:text-slate-100"
        >
          Início
        </Link>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
        <Link
          href={`/dashboard/courses/${programId}`}
          className="hover:text-slate-900 hover:underline dark:hover:text-slate-100"
        >
          {program.title}
        </Link>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
        <span className="font-medium text-slate-900 dark:text-slate-100">
          Minhas Ferramentas de Gestão
        </span>
      </nav>

      <div className="space-y-6 pb-12">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Minhas Ferramentas de Gestão
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Lançamentos financeiros e DRE para seu negócio
          </p>
        </header>

        <FerramentasView
          programId={programId}
          programTitle={program.title}
          categories={categories}
          subcategories={subcategories}
          initialLancamentos={lancamentos}
          initialDREMonth={dreMonth}
          initialDREYear={dreYear}
          currentYear={currentYear}
          currentMonth={currentMonth}
        />
      </div>
    </div>
  )
}
