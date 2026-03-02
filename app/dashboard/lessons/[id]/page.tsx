import { notFound } from 'next/navigation'
import { getLessonDetail } from '@/app/actions/student'
import { LessonView } from '@/components/dashboard/lesson-view'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function LessonPage({ params }: PageProps) {
  const { id } = await params

  const detail = await getLessonDetail(id)

  if (!detail) {
    notFound()
  }

  return <LessonView detail={detail} />
}

