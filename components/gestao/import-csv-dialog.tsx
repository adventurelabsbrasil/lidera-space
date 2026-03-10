'use client'

import { useState, useMemo } from 'react'
import { Upload, Check, AlertCircle } from 'lucide-react'
import { createLancamentosBulk } from '@/app/actions/gestao'
import type {
  GestaoCategory,
  GestaoSubcategory,
  CreateLancamentoInput,
} from '@/app/actions/gestao'
import { Button } from '@/components/ui/button'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const APP_FIELDS = [
  { id: 'date', label: 'Data', required: true },
  { id: 'category', label: 'Categoria', required: true },
  { id: 'subcategory', label: 'Subcategoria', required: true },
  { id: 'amount', label: 'Valor', required: true },
  { id: 'tipo', label: 'Tipo (receita/despesa)', required: false },
  { id: 'description', label: 'Descrição', required: false },
] as const

type AppFieldId = (typeof APP_FIELDS)[number]['id']

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

const SYNONYMS: Record<AppFieldId, string[]> = {
  date: ['data', 'date', 'data do lancamento', 'data do lançamento'],
  category: ['categoria', 'category', 'categoria do lancamento'],
  subcategory: ['subcategoria', 'subcategory', 'subcategoria do lancamento'],
  amount: ['valor', 'value', 'amount', 'valor (r$)', 'valor r$', 'valor em reais'],
  tipo: ['tipo', 'type', 'receita ou despesa', 'natureza'],
  description: ['descricao', 'descrição', 'description', 'obs', 'observacao', 'observação'],
}

function suggestMapping(csvHeaders: string[]): Partial<Record<AppFieldId, string>> {
  const normalizedHeaders = csvHeaders.map((h) => ({ raw: h, norm: normalize(h) }))
  const mapping: Partial<Record<AppFieldId, string>> = {}
  for (const field of APP_FIELDS) {
    const synonyms = SYNONYMS[field.id]
    for (const { raw, norm } of normalizedHeaders) {
      if (synonyms.some((s) => norm.includes(s) || s.includes(norm))) {
        mapping[field.id] = raw
        break
      }
      if (norm === field.label.toLowerCase() || normalize(field.label) === norm) {
        mapping[field.id] = raw
        break
      }
    }
  }
  return mapping
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }
  const sep = text.includes(';') ? ';' : ','
  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        inQuotes = !inQuotes
      } else if ((c === sep || c === '\n') && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += c
      }
    }
    result.push(current.trim())
    return result
  }
  const headers = parseRow(lines[0])
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, j) => {
      row[h] = values[j] ?? ''
    })
    rows.push(row)
  }
  return { headers, rows }
}

function parseDecimal(val: string): number {
  const cleaned = String(val)
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  return parseFloat(cleaned) || 0
}

function parseDate(val: string): string | null {
  const s = String(val).trim()
  if (!s) return null
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(s)
  if (iso) return s
  const ddmmyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (ddmmyy) {
    const [, d, m, y] = ddmmyy
    const year = y!.length === 2 ? `20${y}` : y!
    return `${year}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`
  }
  return null
}

type ImportCSVDialogProps = {
  programId: string
  categories: GestaoCategory[]
  subcategories: GestaoSubcategory[]
  onSuccess: () => void
  trigger?: React.ReactNode
}

export function ImportCSVDialog({
  programId,
  categories,
  subcategories,
  onSuccess,
  trigger,
}: ImportCSVDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload')
  const [fileError, setFileError] = useState<string | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Partial<Record<AppFieldId, string>>>({})
  const [importResult, setImportResult] = useState<{
    inserted?: number
    error?: string
    skipped?: number
  } | null>(null)
  const [importing, setImporting] = useState(false)

  const subcategoryByNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const sub of subcategories) {
      const cat = categories.find((c) => c.id === sub.category_id)
      const key = `${normalize(cat?.name ?? '')}|${normalize(sub.name)}`
      map.set(key, sub.id)
      if (!map.has(`|${normalize(sub.name)}`)) map.set(`|${normalize(sub.name)}`, sub.id)
    }
    return map
  }, [categories, subcategories])

  const resolveSubcategoryId = (categoryName: string, subcategoryName: string): string | null => {
    const key1 = `${normalize(categoryName)}|${normalize(subcategoryName)}`
    const key2 = `|${normalize(subcategoryName)}`
    return subcategoryByNames.get(key1) ?? subcategoryByNames.get(key2) ?? null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null)
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
      setFileError('Selecione um arquivo CSV.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = (reader.result as string) || ''
        const { headers, rows } = parseCSV(text)
        if (headers.length === 0) {
          setFileError('Não foi possível ler o cabeçalho do CSV.')
          return
        }
        setCsvHeaders(headers)
        setCsvRows(rows)
        setMapping(suggestMapping(headers))
        setStep('mapping')
      } catch {
        setFileError('Erro ao ler o arquivo.')
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const mappedRows = useMemo(() => {
    return csvRows.slice(0, 5).map((row) => {
      const r: Record<AppFieldId, string> = {} as Record<AppFieldId, string>
      APP_FIELDS.forEach((f) => {
        const col = mapping[f.id]
        r[f.id] = (col ? row[col] : '') ?? ''
      })
      return r
    })
  }, [csvRows, mapping])

  const canImport = useMemo(() => {
    const hasDate = !!mapping.date
    const hasAmount = !!mapping.amount
    const hasCat = !!mapping.category
    const hasSub = !!mapping.subcategory
    return hasDate && hasAmount && (hasCat && hasSub)
  }, [mapping])

  const handleImport = async () => {
    if (!canImport) return
    setImporting(true)
    const items: CreateLancamentoInput[] = []
    let skipped = 0
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i]
      const dateVal = mapping.date ? row[mapping.date] : ''
      const amountVal = mapping.amount ? row[mapping.amount] : ''
      const categoryVal = mapping.category ? row[mapping.category] : ''
      const subcategoryVal = mapping.subcategory ? row[mapping.subcategory] : ''
      const tipoVal = mapping.tipo ? row[mapping.tipo] : ''
      const descVal = mapping.description ? row[mapping.description] : ''

      const date = parseDate(dateVal)
      if (!date) {
        skipped++
        continue
      }
      let amountCents = Math.round(parseDecimal(amountVal) * 100)
      if (tipoVal) {
        const t = normalize(tipoVal)
        if (t.includes('despesa') || t === 'd') amountCents = -Math.abs(amountCents)
        else amountCents = Math.abs(amountCents)
      }
      const subId = resolveSubcategoryId(categoryVal, subcategoryVal)
      if (!subId) {
        skipped++
        continue
      }
      items.push({
        subcategory_id: subId,
        amount_cents: amountCents,
        date,
        description: descVal.trim() || null,
      })
    }
    const result = await createLancamentosBulk(programId, items)
    setImporting(false)
    setImportResult(
      result.error
        ? { error: result.error }
        : { inserted: result.inserted, skipped: skipped > 0 ? skipped : undefined }
    )
    setStep('result')
    if (result.success && (result.inserted ?? 0) > 0) onSuccess()
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setStep('upload')
      setFileError(null)
      setCsvHeaders([])
      setCsvRows([])
      setMapping({})
      setImportResult(null)
    }
    setOpen(open)
  }

  const emptyOption = '__none__'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <Upload className="size-4" />
            Importar CSV
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
          <DialogDescription>
            Envie um arquivo CSV e associe as colunas aos campos do sistema. O mapeamento é
            sugerido automaticamente.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Arquivo CSV</Label>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-400 dark:file:bg-slate-800 dark:file:text-slate-300"
              />
            </div>
            {fileError && (
              <p className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
                <AlertCircle className="size-4 shrink-0" />
                {fileError}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Use vírgula ou ponto-e-vírgula como separador. Colunas esperadas (podem ter nomes
              parecidos): Data, Categoria, Subcategoria, Valor, Tipo, Descrição.
            </p>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Confirme ou altere a associação entre as colunas do seu CSV e os campos do sistema.
            </p>
            <div className="space-y-3">
              {APP_FIELDS.map((field) => (
                <div key={field.id} className="grid gap-2">
                  <Label className="text-sm">
                    {field.label}
                    {field.required && (
                      <span className="ml-1 text-rose-500" aria-label="obrigatório">
                        *
                      </span>
                    )}
                  </Label>
                  <Select
                    value={mapping[field.id] ?? emptyOption}
                    onValueChange={(v) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field.id]: v === emptyOption ? undefined : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Não importar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={emptyOption}>— Não importar</SelectItem>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button
                onClick={() => setStep('preview')}
                disabled={!mapping.date || !mapping.amount || !mapping.category || !mapping.subcategory}
              >
                Visualizar prévia
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Primeiras linhas com o mapeamento atual. Confira e importe.
            </p>
            <div className="max-h-48 overflow-auto rounded-md border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900">
                  <tr>
                    {APP_FIELDS.filter((f) => mapping[f.id]).map((f) => (
                      <th key={f.id} className="border-b px-2 py-2 font-medium">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                      {APP_FIELDS.filter((f) => mapping[f.id]).map((f) => (
                        <td key={f.id} className="px-2 py-1.5">
                          {row[f.id] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total de linhas a importar: {csvRows.length}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Voltar
              </Button>
              <Button onClick={handleImport} disabled={!canImport || importing}>
                {importing ? 'Importando...' : `Importar ${csvRows.length} lançamento(s)`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'result' && importResult && (
          <div className="space-y-4">
            {importResult.error ? (
              <p className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
                <AlertCircle className="size-4 shrink-0" />
                {importResult.error}
              </p>
            ) : (
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <Check className="size-4 shrink-0" />
                  {importResult.inserted ?? 0} lançamento(s) importado(s) com sucesso.
                </p>
                {importResult.skipped != null && importResult.skipped > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {importResult.skipped} linha(s) ignorada(s) (data ou categoria inválida).
                  </p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Fechar</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('upload')
                  setImportResult(null)
                }}
              >
                Importar outro arquivo
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
