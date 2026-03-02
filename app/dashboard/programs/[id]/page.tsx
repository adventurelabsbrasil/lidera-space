import { notFound } from 'next/navigation'
import {
  getProgramById,
  getModulesByProgram,
  getLessonsByModule,
} from '@/app/actions/admin'
import { ProgramDetailView } from '@/components/dashboard/program-detail-view'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ProgramDetailPage({ params }: PageProps) {
  const { id } = await params

  const program = await getProgramById(id)
  if (!program) notFound()

  const modules = await getModulesByProgram(id)
  const modulesWithLessons = await Promise.all(
    modules.map(async (module) => ({
      module,
      lessons: await getLessonsByModule(module.id),
    }))
  )

  return (
    <ProgramDetailView
      program={program}
      modulesWithLessons={modulesWithLessons}
    />
  )
}
