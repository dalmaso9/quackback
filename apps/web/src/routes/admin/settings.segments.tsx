import { createFileRoute } from '@tanstack/react-router'
import { TagIcon } from '@heroicons/react/24/solid'
import { BackLink } from '@/components/ui/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { SegmentList } from '@/components/admin/segments/segment-list'
import { adminQueries } from '@/lib/client/queries/admin'

export const Route = createFileRoute('/admin/settings/segments')({
  loader: async ({ context }) => {
    const { queryClient } = context
    await Promise.all([
      queryClient.ensureQueryData(adminQueries.segments()),
      queryClient.ensureQueryData(adminQueries.userAttributes()),
    ])
    return {}
  },
  component: SegmentsPage,
})

function SegmentsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="lg:hidden">
        <BackLink to="/admin/settings">Configurações</BackLink>
      </div>
      <PageHeader
        icon={TagIcon}
        title="Segmentos"
        description="Organize usuários em grupos para filtragem e análise. Segmentos manuais são atribuídos manualmente; segmentos dinâmicos se atualizam automaticamente com base nas regras."
      />
      <SegmentList />
    </div>
  )
}
