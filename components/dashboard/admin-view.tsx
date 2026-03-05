'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Plus } from 'lucide-react'
import { createProgram, type Program } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Criando...' : 'Criar programa'}
    </Button>
  )
}

type AdminViewProps = {
  programs: Program[]
}

export function AdminView({ programs }: AdminViewProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(createProgram, null)

  useEffect(() => {
    if (state?.success) setOpen(false)
  }, [state?.success])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gestão de Programas</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/admin/users">Gerenciar Usuários</Link>
          </Button>
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="size-4" />
            Novo Programa
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead className="hidden md:table-cell">Descrição</TableHead>
              <TableHead className="text-right">Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Nenhum programa cadastrado. Clique em &quot;Novo Programa&quot; para começar.
                </TableCell>
              </TableRow>
            ) : (
              programs.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/dashboard/programs/${p.id}`}
                      className="text-primary hover:underline"
                    >
                      {p.title}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate hidden md:table-cell">
                    {p.description ?? '—'}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {new Date(p.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Programa</DialogTitle>
            <DialogDescription>
              Preencha o título e a descrição do novo programa de formação.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="program-title">Título</Label>
              <Input
                id="program-title"
                name="title"
                placeholder="Ex: Liderança em Vendas"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="program-description">Descrição</Label>
              <Input
                id="program-description"
                name="description"
                placeholder="Breve descrição do programa (opcional)"
              />
            </div>
            {state?.error && (
              <p className="text-destructive text-sm" role="alert">
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
  )
}
