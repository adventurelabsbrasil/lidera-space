import { createClient } from '@/utils/supabase/server'
import { getPrograms } from '@/app/actions/admin'
import { AdminView } from '@/components/dashboard/admin-view'

function StudentView() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Visão Aluno</h1>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'aluno'

  if (role === 'admin') {
    const programs = await getPrograms()
    return <AdminView programs={programs} />
  }

  return <StudentView />
}
