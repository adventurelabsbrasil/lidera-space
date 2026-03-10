'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export type GestaoCategory = {
  id: string
  name: string
  order: number
}

export type GestaoSubcategory = {
  id: string
  category_id: string
  name: string
  order: number
}

export type GestaoLancamento = {
  id: string
  user_id: string
  program_id: string
  subcategory_id: string
  amount_cents: number
  date: string
  description: string | null
  created_at: string
  updated_at: string
  category_id?: string
  category_name?: string
  subcategory_name?: string
}

export type CreateLancamentoInput = {
  subcategory_id: string
  amount_cents: number
  date: string
  description?: string | null
}

export type UpdateLancamentoInput = Partial<CreateLancamentoInput>

export type CreateLancamentoResult = { error?: string; success?: boolean; id?: string }
export type UpdateLancamentoResult = { error?: string; success?: boolean }
export type DeleteLancamentoResult = { error?: string; success?: boolean }

const PROGRAMO_LUCRO_LIBERDADE_TITLE = 'Lucro e Liberdade'

async function getSupabaseAndUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return { supabase, userId: null as string | null }
  return { supabase, userId: user.id }
}

export async function getProgramLucroELiberdadeId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('space_programs')
    .select('id')
    .ilike('title', PROGRAMO_LUCRO_LIBERDADE_TITLE)
    .limit(1)
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

export async function isGestaoProgram(programId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('space_programs')
    .select('id, title')
    .eq('id', programId)
    .limit(1)
    .maybeSingle()
  if (!data) return false
  return (data as { title: string }).title === PROGRAMO_LUCRO_LIBERDADE_TITLE
}

export async function getGestaoCategories(): Promise<GestaoCategory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('gestao_categories')
    .select('id, name, order')
    .order('order', { ascending: true })
  if (error) return []
  return (data ?? []) as GestaoCategory[]
}

export async function getGestaoSubcategories(
  categoryId?: string | null
): Promise<GestaoSubcategory[]> {
  const supabase = await createClient()
  let query = supabase
    .from('gestao_subcategories')
    .select('id, category_id, name, order')
    .order('order', { ascending: true })
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }
  const { data, error } = await query
  if (error) return []
  return (data ?? []) as GestaoSubcategory[]
}

export type ListLancamentosFilters = {
  fromDate?: string
  toDate?: string
  userId?: string
}

export async function listLancamentos(
  programId: string,
  filters?: ListLancamentosFilters
): Promise<GestaoLancamento[]> {
  const { supabase, userId } = await getSupabaseAndUser()
  if (!userId) return []

  const { data: profile } = await supabase
    .from('space_users')
    .select('role')
    .eq('id', userId)
    .single()
  const isAdmin = profile?.role === 'admin'

  let query = supabase
    .from('gestao_lancamentos')
    .select('id, user_id, program_id, subcategory_id, amount_cents, date, description, created_at, updated_at')
    .eq('program_id', programId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    query = query.eq('user_id', userId)
  } else if (filters?.userId) {
    query = query.eq('user_id', filters.userId)
  } else {
    query = query.eq('user_id', userId)
  }

  if (filters?.fromDate) query = query.gte('date', filters.fromDate)
  if (filters?.toDate) query = query.lte('date', filters.toDate)

  const { data: rows, error } = await query
  if (error) return []

  const subIds = [...new Set((rows ?? []).map((r: { subcategory_id: string }) => r.subcategory_id))]
  if (subIds.length === 0) {
    return (rows ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      category_id: undefined,
      category_name: undefined,
      subcategory_name: undefined,
    })) as GestaoLancamento[]
  }

  const { data: subs } = await supabase
    .from('gestao_subcategories')
    .select('id, category_id, name')
    .in('id', subIds)
  const subMap = new Map((subs ?? []).map((s: { id: string; category_id: string; name: string }) => [s.id, s]))
  const catIds = [...new Set((subs ?? []).map((s: { category_id: string }) => s.category_id))]
  const { data: cats } = await supabase
    .from('gestao_categories')
    .select('id, name')
    .in('id', catIds)
  const catMap = new Map((cats ?? []).map((c: { id: string; name: string }) => [c.id, c]))

  return (rows ?? []).map((row: Record<string, unknown>) => {
    const sub = subMap.get(row.subcategory_id as string)
    const cat = sub ? catMap.get(sub.category_id) : null
    return {
      ...row,
      category_id: sub?.category_id,
      category_name: cat?.name,
      subcategory_name: sub?.name,
    } as GestaoLancamento
  })
}

export async function createLancamento(
  programId: string,
  input: CreateLancamentoInput
): Promise<CreateLancamentoResult> {
  const { supabase, userId } = await getSupabaseAndUser()
  if (!userId) return { error: 'Não autenticado.' }

  const ok = await isGestaoProgram(programId)
  if (!ok) return { error: 'Programa não autorizado para esta ferramenta.' }

  const { error, data } = await supabase
    .from('gestao_lancamentos')
    .insert({
      user_id: userId,
      program_id: programId,
      subcategory_id: input.subcategory_id,
      amount_cents: input.amount_cents,
      date: input.date,
      description: input.description ?? null,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/courses/${programId}/ferramentas`)
  return { success: true, id: (data as { id: string })?.id }
}

export type CreateLancamentosBulkResult = {
  error?: string
  success?: boolean
  inserted?: number
  errors?: string[]
}

export async function createLancamentosBulk(
  programId: string,
  items: CreateLancamentoInput[]
): Promise<CreateLancamentosBulkResult> {
  const { supabase, userId } = await getSupabaseAndUser()
  if (!userId) return { error: 'Não autenticado.' }

  const ok = await isGestaoProgram(programId)
  if (!ok) return { error: 'Programa não autorizado para esta ferramenta.' }

  if (items.length === 0) return { success: true, inserted: 0 }
  const rows = items.map((input) => ({
    user_id: userId,
    program_id: programId,
    subcategory_id: input.subcategory_id,
    amount_cents: input.amount_cents,
    date: input.date,
    description: input.description ?? null,
  }))

  const { error } = await supabase.from('gestao_lancamentos').insert(rows)
  if (error) return { error: error.message, errors: [error.message] }
  revalidatePath(`/dashboard/courses/${programId}/ferramentas`)
  return { success: true, inserted: rows.length }
}

export async function updateLancamento(
  id: string,
  input: UpdateLancamentoInput
): Promise<UpdateLancamentoResult> {
  const { supabase, userId } = await getSupabaseAndUser()
  if (!userId) return { error: 'Não autenticado.' }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.subcategory_id != null) updates.subcategory_id = input.subcategory_id
  if (input.amount_cents != null) updates.amount_cents = input.amount_cents
  if (input.date != null) updates.date = input.date
  if (input.description !== undefined) updates.description = input.description

  const { error } = await supabase.from('gestao_lancamentos').update(updates).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/courses')
  return { success: true }
}

export async function deleteLancamento(id: string): Promise<DeleteLancamentoResult> {
  const { supabase, userId } = await getSupabaseAndUser()
  if (!userId) return { error: 'Não autenticado.' }

  const { error } = await supabase.from('gestao_lancamentos').delete().eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/courses')
  return { success: true }
}

export type DRECategoryRow = {
  categoryId: string
  categoryName: string
  subcategories: { subcategoryId: string; subcategoryName: string; amountCents: number }[]
  totalCents: number
}

export type DREMonthly = {
  year: number
  month: number
  categories: DRECategoryRow[]
  receitaTotalCents: number
  despesaTotalCents: number
  lucroCents: number
}

function getCategoryIdFromSubcategory(
  subcategories: GestaoSubcategory[],
  subId: string
): string | null {
  const sub = subcategories.find((s) => s.id === subId)
  return sub?.category_id ?? null
}

export async function getDREMonthly(
  programId: string,
  year: number,
  month: number,
  userIdFilter?: string
): Promise<DREMonthly | null> {
  const { supabase, userId } = await getSupabaseAndUser()
  if (!userId) return null

  const fromDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  let query = supabase
    .from('gestao_lancamentos')
    .select('subcategory_id, amount_cents')
    .eq('program_id', programId)
    .gte('date', fromDate)
    .lte('date', toDate)

  const { data: profile } = await supabase
    .from('space_users')
    .select('role')
    .eq('id', userId)
    .single()
  const targetUserId = profile?.role === 'admin' && userIdFilter ? userIdFilter : userId
  query = query.eq('user_id', targetUserId)

  const { data: lancamentos, error } = await query
  if (error) return null

  const categories = await getGestaoCategories()
  const subcategories = await getGestaoSubcategories()

  const byCategory = new Map<
    string,
    { name: string; bySub: Map<string, { name: string; cents: number }>; total: number }
  >()
  for (const cat of categories) {
    byCategory.set(cat.id, { name: cat.name, bySub: new Map(), total: 0 })
  }

  let receitaTotalCents = 0
  let despesaTotalCents = 0

  for (const row of lancamentos ?? []) {
    const subId = (row as { subcategory_id: string; amount_cents: number }).subcategory_id
    const cents = (row as { subcategory_id: string; amount_cents: number }).amount_cents
    const catId = getCategoryIdFromSubcategory(subcategories, subId)
    if (!catId) continue
    const entry = byCategory.get(catId)
    if (!entry) continue
    const sub = subcategories.find((s) => s.id === subId)
    const subName = sub?.name ?? 'Outro'
    const prev = entry.bySub.get(subId) ?? { name: subName, cents: 0 }
    entry.bySub.set(subId, { name: subName, cents: prev.cents + cents })
    entry.total += cents
    if (cents >= 0) receitaTotalCents += cents
    else despesaTotalCents += Math.abs(cents)
  }

  const categoriesOut: DRECategoryRow[] = categories.map((cat) => {
    const entry = byCategory.get(cat.id)!
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      subcategories: Array.from(entry.bySub.entries()).map(([subId, v]) => ({
        subcategoryId: subId,
        subcategoryName: v.name,
        amountCents: v.cents,
      })),
      totalCents: entry.total,
    }
  })

  return {
    year,
    month,
    categories: categoriesOut,
    receitaTotalCents,
    despesaTotalCents,
    lucroCents: receitaTotalCents - despesaTotalCents,
  }
}

export type DREAnnualMonth = {
  receitaCents: number
  despesaCents: number
  lucroCents: number
  byCategory: Record<string, number>
}

export async function getDREAnnual(
  programId: string,
  year: number,
  userIdFilter?: string
): Promise<{ months: Record<number, DREAnnualMonth>; categories: GestaoCategory[] } | null> {
  const months: Record<number, DREAnnualMonth> = {}
  const categories = await getGestaoCategories()
  for (let m = 1; m <= 12; m++) {
    const dre = await getDREMonthly(programId, year, m, userIdFilter)
    if (!dre) {
      months[m] = {
        receitaCents: 0,
        despesaCents: 0,
        lucroCents: 0,
        byCategory: Object.fromEntries(categories.map((c) => [c.id, 0])),
      }
      continue
    }
    const byCategory: Record<string, number> = {}
    for (const row of dre.categories) {
      byCategory[row.categoryId] = row.totalCents
    }
    for (const c of categories) {
      if (!(c.id in byCategory)) byCategory[c.id] = 0
    }
    months[m] = {
      receitaCents: dre.receitaTotalCents,
      despesaCents: dre.despesaTotalCents,
      lucroCents: dre.lucroCents,
      byCategory,
    }
  }
  return { months, categories }
}

export async function exportLancamentosCSV(programId: string): Promise<{ csv: string; error?: string }> {
  const { userId } = await getSupabaseAndUser()
  if (!userId) return { csv: '', error: 'Não autenticado.' }

  const list = await listLancamentos(programId)
  const BOM = '\uFEFF'
  const header = 'Data;Categoria;Subcategoria;Valor (R$);Tipo;Descrição\n'
  const rows = list.map((l) => {
    const date = l.date
    const cat = l.category_name ?? ''
    const sub = l.subcategory_name ?? ''
    const reais = (l.amount_cents / 100).toFixed(2).replace('.', ',')
    const tipo = l.amount_cents >= 0 ? 'Receita' : 'Despesa'
    const desc = (l.description ?? '').replace(/;/g, ',')
    return `${date};${cat};${sub};${reais};${tipo};${desc}`
  })
  const csv = BOM + header + rows.join('\n')
  return { csv }
}
