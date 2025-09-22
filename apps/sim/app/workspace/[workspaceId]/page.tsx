import { redirect } from 'next/navigation'

export default function WorkspacePage({ params }: { params: { workspaceId: string } }) {
  const { workspaceId } = params
  redirect(`/workspace/${workspaceId}/w`)
}
