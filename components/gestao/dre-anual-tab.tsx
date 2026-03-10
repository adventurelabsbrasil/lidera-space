'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getDREAnnual } from '@/app/actions/gestao'
import type { GestaoCategory, DREAnnualMonth } from '@/app/actions/gestao'
import { Button } from '@/components/ui/button'

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
]

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

type DREAnualTabProps = {
  programId: string
  initialDRE: {
    months: Record<number, DREAnnualMonth>
    categories: GestaoCategory[]
  } | null
  currentYear: number
}

export function DREAnualTab({
  programId,
  initialDRE,
  currentYear,
}: DREAnualTabProps) {
  const router = useRouter()
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState(initialDRE)
  const [loading, setLoading] = useState(false)

  const handleFilter = async () => {
    setLoading(true)
    const result = await getDREAnnual(programId, year)
    setData(result)
    setLoading(false)
    router.refresh()
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
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
          <Button onClick={handleFilter} disabled={loading}>
            {loading ? 'Carregando...' : 'Atualizar'}
          </Button>
        </div>
        <p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Selecione o ano e clique em Atualizar.
        </p>
      </div>
    )
  }

  const { months, categories } = data

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
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
          <Button onClick={handleFilter} disabled={loading}>
            {loading ? 'Carregando...' : 'Atualizar'}
          </Button>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="print:hidden">
          Imprimir DRE Anual
        </Button>
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[800px] border-collapse text-sm print:text-[10px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="py-3 pr-4 text-left font-semibold text-slate-900 dark:text-slate-100">
                Categoria
              </th>
              {MONTHS.map((label, i) => (
                <th
                  key={i}
                  className="min-w-[4rem] px-2 py-3 text-right font-medium text-slate-600 dark:text-slate-400 print:min-w-0"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr
                key={cat.id}
                className="border-b border-slate-100 dark:border-slate-800"
              >
                <td className="py-2 pr-4 font-medium text-slate-900 dark:text-slate-100">
                  {cat.name}
                </td>
                {MONTHS.map((_, i) => {
                  const m = i + 1
                  const cell = months[m]?.byCategory[cat.id] ?? 0
                  return (
                    <td
                      key={m}
                      className={`px-2 py-2 text-right ${
                        cell >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {cell !== 0 ? formatBRL(cell) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-slate-200 font-semibold dark:border-slate-700">
              <td className="py-3 pr-4 text-slate-900 dark:text-slate-100">Lucro</td>
              {MONTHS.map((_, i) => {
                const m = i + 1
                const lucro = months[m]?.lucroCents ?? 0
                return (
                  <td
                    key={m}
                    className={`px-2 py-3 text-right ${
                      lucro >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {lucro !== 0 ? formatBRL(lucro) : '—'}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
