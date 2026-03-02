import { login } from '@/app/actions/auth'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LoginForm } from '@/components/login-form'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-semibold">Lidera Space</CardTitle>
          <CardDescription>
            Entre com seu e-mail e senha para acessar a plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm action={login} />
        </CardContent>
      </Card>
    </main>
  )
}
