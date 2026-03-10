'use client'

import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import type {
  GestaoCategory,
  GestaoSubcategory,
  GestaoLancamento,
  DREMonthly,
  DREAnnualMonth,
} from '@/app/actions/gestao'
import { LancamentosTab } from './lancamentos-tab'
import { DREMensalTab } from './dre-mensal-tab'
import { DREAnualTab } from './dre-anual-tab'

export type FerramentasViewProps = {
  programId: string
  programTitle: string
  categories: GestaoCategory[]
  subcategories: GestaoSubcategory[]
  initialLancamentos: GestaoLancamento[]
  initialDREMonth: DREMonthly | null
  initialDREYear: {
    months: Record<number, DREAnnualMonth>
    categories: GestaoCategory[]
  } | null
  currentYear: number
  currentMonth: number
}

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

export function FerramentasView({
  programId,
  programTitle,
  categories,
  subcategories,
  initialLancamentos,
  initialDREMonth,
  initialDREYear,
  currentYear,
  currentMonth,
}: FerramentasViewProps) {
  const router = useRouter()

  const receitaTotal = initialDREMonth?.receitaTotalCents ?? 0
  const despesaTotal = initialDREMonth?.despesaTotalCents ?? 0
  const lucro = initialDREMonth?.lucroCents ?? 0
  const cmvCents =
    initialDREMonth?.categories.find((c) => c.categoryName === 'CMV')?.totalCents ?? 0
  const percentualCMV =
    receitaTotal > 0 ? Math.round((Math.abs(cmvCents) / receitaTotal) * 100) : 0

  const onLancamentoChange = () => {
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Faturamento total
            </p>
            <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              {formatBRL(receitaTotal)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Lucro líquido
            </p>
            <p
              className={`mt-1 text-xl font-semibold ${
                lucro >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatBRL(lucro)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              % CMV
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">
              {percentualCMV}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lancamentos" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
          <TabsTrigger value="dre-mensal">DRE Mensal</TabsTrigger>
          <TabsTrigger value="dre-anual">DRE Anual</TabsTrigger>
        </TabsList>
        <TabsContent value="lancamentos" className="mt-6">
          <LancamentosTab
            programId={programId}
            categories={categories}
            subcategories={subcategories}
            initialLancamentos={initialLancamentos}
            onSuccess={onLancamentoChange}
          />
        </TabsContent>
        <TabsContent value="dre-mensal" className="mt-6">
          <DREMensalTab
            programId={programId}
            initialDRE={initialDREMonth}
            currentYear={currentYear}
            currentMonth={currentMonth}
          />
        </TabsContent>
        <TabsContent value="dre-anual" className="mt-6">
          <DREAnualTab
            programId={programId}
            initialDRE={initialDREYear}
            currentYear={currentYear}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
