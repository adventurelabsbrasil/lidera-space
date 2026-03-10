'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { getDREMonthly } from '@/app/actions/gestao'
import type { DREMonthly } from '@/app/actions/gestao'

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

type DREMensalTabProps = {
  programId: string
  initialDRE: DREMonthly | null
  currentYear: number
  currentMonth: number
}

export function DREMensalTab({
  programId,
  initialDRE,
  currentYear,
  currentMonth,
}: DREMensalTabProps) {
  const router = useRouter()
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [dre, setDre] = useState<DREMonthly | null>(initialDRE)
  const [loading, setLoading] = useState(false)

  const handleFilter = async () => {
    setLoading(true)
    const data = await getDREMonthly(programId, year, month)
    setDre(data)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Mês</label>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            {MONTHS.map((name, i) => (
              <option key={i} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ano</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min={2020}
            max={2030}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <button
          type="button"
          onClick={handleFilter}
          disabled={loading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {loading ? 'Carregando...' : 'Atualizar'}
        </button>
      </div>

      {!dre ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Selecione mês e ano e clique em Atualizar.
        </p>
      ) : (
        <div className="space-y-4">
          <Accordion type="multiple" className="w-full">
            {dre.categories.map((cat) => (
              <AccordionItem
                key={cat.categoryId}
                value={cat.categoryId}
                className="border-slate-200 dark:border-slate-700"
              >
                <AccordionTrigger className="hover:no-underline">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {cat.categoryName}
                  </span>
                  <span
                    className={`ml-2 ${
                      cat.totalCents >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatBRL(cat.totalCents)}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pl-2">
                    {cat.subcategories.map((sub) => (
                      <li
                        key={sub.subcategoryId}
                        className="flex justify-between text-sm text-slate-600 dark:text-slate-400"
                      >
                        <span>{sub.subcategoryName}</span>
                        <span
                          className={
                            sub.amountCents >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }
                        >
                          {formatBRL(sub.amountCents)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="flex justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Resultado (Lucro)</span>
            <span
              className={
                dre.lucroCents >= 0
                  ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                  : 'font-semibold text-rose-600 dark:text-rose-400'
              }
            >
              {formatBRL(dre.lucroCents)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
