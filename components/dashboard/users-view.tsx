'use client'

import { useState } from 'react'
import { updateUserRole, type UserProfile } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Copy, Check, Users } from 'lucide-react'
import Link from 'next/link'

type UsersViewProps = {
  users: UserProfile[]
  currentUserId: string
}

export function UsersView({ users, currentUserId }: UsersViewProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [openInvite, setOpenInvite] = useState(false)

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'aluno') => {
    setLoadingId(userId)
    const { error } = await updateUserRole(userId, newRole)
    if (error) {
      alert(error)
    }
    setLoadingId(null)
  }

  const handleCopyLink = () => {
    const url = window.location.origin + '/login'
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <span className="text-muted-foreground">/</span>
            Gestão de Usuários
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os alunos matriculados e a equipe de administradores.
          </p>
        </div>
        <Button onClick={() => setOpenInvite(true)} className="gap-2">
          <Users className="size-4" />
          Convite & Cadastro
        </Button>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Perfil (Role)</TableHead>
              <TableHead className="text-right">Cadastrado em</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.email} {u.id === currentUserId && <span className="text-xs text-primary ml-2">(Você)</span>}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {u.role.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.id !== currentUserId && (
                      <Button
                        variant={u.role === 'admin' ? 'destructive' : 'secondary'}
                        size="sm"
                        disabled={loadingId === u.id}
                        onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'aluno' : 'admin')}
                      >
                        {loadingId === u.id ? 'Aguarde...' : (u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={openInvite} onOpenChange={setOpenInvite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Como adicionar novos usuários</DialogTitle>
            <DialogDescription className="pt-4 space-y-4">
              <p>
                O Lidera Space opera em um modelo aberto por convite. 
                Isso significa que <strong>qualquer pessoa que tiver o link de login da plataforma pode criar uma conta.</strong>
              </p>
              
              <div className="rounded-md bg-muted p-4 space-y-3">
                <h4 className="font-medium text-foreground">1. Link Público de Cadastro</h4>
                <p className="text-xs">
                  Envie este link para seus alunos ou clientes. Eles poderão fazer login pelo Google ou criar uma senha na mesma tela. Ao entrarem, receberão automaticamente o perfil de "Aluno".
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded border bg-background px-3 py-2 text-xs truncate">
                    {typeof window !== 'undefined' ? window.location.origin + '/login' : '...'}
                  </code>
                  <Button variant="secondary" size="icon" onClick={handleCopyLink} className="shrink-0">
                    {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>

              <div className="rounded-md bg-muted p-4 space-y-3">
                <h4 className="font-medium text-foreground">2. Convite via E-mail Silencioso</h4>
                <p className="text-xs">
                  Se você preferir que o aluno receba um e-mail oficial antes de acessar o site, você deve usar o painel do Supabase da sua empresa:
                </p>
                <ol className="list-decimal pl-4 text-xs space-y-1">
                  <li>Acesse o seu Supabase.</li>
                  <li>Vá no menu lateral esquerdo em <strong>Authentication</strong>.</li>
                  <li>Clique em <strong>Add user</strong> e depois <strong>Invite user</strong>.</li>
                  <li>Digite o e-mail do aluno e clique em enviar.</li>
                </ol>
              </div>

            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

    </div>
  )
}
