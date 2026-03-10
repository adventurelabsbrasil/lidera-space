'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  Receipt,
  ShoppingCart,
  Briefcase,
  FileText,
  Plus,
  Download,
} from 'lucide-react'
import { createLancamento, exportLancamentosCSV } from '@/app/actions/gestao'
import type { GestaoCategory, GestaoSubcategory, GestaoLancamento } from '@/app/actions/gestao'
import { ImportCSVDialog } from './import-csv-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Combobox, type ComboboxOption } from './combobox'

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Receita: Receipt,
  CMV: ShoppingCart,
  'Mão-de-Obra': Briefcase,
  'Despesas (Fixas e Variáveis)': FileText,
}

function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100)
}

function LancamentoRow({ item }: { item: GestaoLancamento }) {
  const isReceita = item.amount_cents >= 0
  const Icon = item.category_name ? CATEGORY_ICONS[item.category_name] ?? Receipt : Receipt
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Icon className="size-5 text-slate-600 dark:text-slate-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900 dark:text-slate-100">
          {item.subcategory_name ?? item.category_name ?? 'Lançamento'}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
          {item.description ? ` · ${item.description}` : ''}
        </p>
      </div>
      <p
        className={`shrink-0 text-right font-semibold ${
          isReceita ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}
      >
        {isReceita ? '+' : ''}
        {formatBRL(item.amount_cents)}
      </p>
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar lançamento'}
    </Button>
  )
}

type LancamentosTabProps = {
  programId: string
  categories: GestaoCategory[]
  subcategories: GestaoSubcategory[]
  initialLancamentos: GestaoLancamento[]
  onSuccess: () => void
}

export function LancamentosTab({
  programId,
  categories,
  subcategories,
  initialLancamentos,
  onSuccess,
}: LancamentosTabProps) {
  const [open, setOpen] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [state, formAction] = useActionState(
    async (_: { error?: string; success?: boolean } | null, formData: FormData) => {
      const amountStr = formData.get('amount_cents') as string
      const amountCents = Math.round(parseFloat(amountStr || '0') * 100)
      const result = await createLancamento(programId, {
        subcategory_id: formData.get('subcategory_id') as string,
        amount_cents: amountCents,
        date: formData.get('date') as string,
        description: (formData.get('description') as string) || null,
      })
      if (result.success) {
        setOpen(false)
        setCategoryId('')
        setSubcategoryId('')
        onSuccess()
      }
      return result
    },
    null
  )

  const categoryOptions: ComboboxOption[] = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }))
  const subcategoryOptions: ComboboxOption[] = subcategories
    .filter((s) => !categoryId || s.category_id === categoryId)
    .map((s) => ({ value: s.id, label: s.name }))

  const handleExportCSV = async () => {
    const { csv, error } = await exportLancamentosCSV(programId)
    if (error || !csv) return
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lancamentos-gestao-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Lançamentos recentes
        </h2>
        <div className="flex flex-wrap gap-2">
          <ImportCSVDialog
            programId={programId}
            categories={categories}
            subcategories={subcategories}
            onSuccess={onSuccess}
          />
          <Button variant="outline" onClick={handleExportCSV} className="gap-2">
            <Download className="size-4" />
            Exportar CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="size-4" />
                Novo lançamento
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo lançamento</DialogTitle>
              <DialogDescription>
                Preencha a categoria, subcategoria, valor e data. Use valor positivo para receita
                e negativo para despesa.
              </DialogDescription>
            </DialogHeader>
            <form
              action={formAction}
              className="grid gap-4"
              onSubmit={(e) => {
                if (!subcategoryId) {
                  e.preventDefault()
                  return
                }
              }}
            >
              <input type="hidden" name="subcategory_id" value={subcategoryId} />
              <div className="grid gap-2">
                <Label>Categoria</Label>
                <Combobox
                  options={categoryOptions}
                  value={categoryId}
                  onValueChange={(v) => {
                    setCategoryId(v)
                    setSubcategoryId('')
                  }}
                  placeholder="Selecione a categoria"
                />
              </div>
              <div className="grid gap-2">
                <Label>Subcategoria</Label>
                <Combobox
                  options={subcategoryOptions}
                  value={subcategoryId}
                  onValueChange={setSubcategoryId}
                  placeholder="Selecione a subcategoria"
                  emptyText={!categoryId ? 'Selecione primeiro uma categoria.' : 'Nenhum encontrado.'}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Valor (em reais)</Label>
                <Input
                  id="amount"
                  name="amount_cents"
                  type="number"
                  step="0.01"
                  min="-999999.99"
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Data</Label>
                <Input id="date" name="date" type="date" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input id="description" name="description" type="text" placeholder="Ex: Venda almoço" />
              </div>
              {state?.error && (
                <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">
                  {state.error}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <SubmitButton />
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="space-y-3">
        {initialLancamentos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Nenhum lançamento ainda. Clique em &quot;Novo lançamento&quot; para começar.
          </p>
        ) : (
          initialLancamentos.map((item) => <LancamentoRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}
