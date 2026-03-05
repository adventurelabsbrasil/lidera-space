import { createClient } from '@/utils/supabase/server'
import { getUsers } from '@/app/actions/admin'
import { UsersView } from '@/components/dashboard/users-view'
import { redirect } from 'next/navigation'

export default async function UsersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Double check protection (mesmo que o middleware ja proteja)
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }

  const users = await getUsers()

  return <UsersView users={users} currentUserId={user.id} />
}
