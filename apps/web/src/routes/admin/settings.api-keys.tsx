import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { adminQueries } from '@/lib/client/queries/admin'
import { KeyIcon } from '@heroicons/react/24/solid'
import { BackLink } from '@/components/ui/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { ApiKeysSettings } from '@/components/admin/settings/api-keys/api-keys-settings'
import { ApiUsageGuide } from '@/components/admin/settings/api-keys/api-usage-guide'
import { SettingsCard } from '@/components/admin/settings/settings-card'

export const Route = createFileRoute('/admin/settings/api-keys')({
  loader: async ({ context }) => {
    const { requireWorkspaceRole } = await import('@/lib/server/functions/workspace-utils')
    await requireWorkspaceRole({ data: { allowedRoles: ['admin'] } })

    const { queryClient } = context
    await queryClient.ensureQueryData(adminQueries.apiKeys())

    return {}
  },
  component: ApiKeysPage,
})

function useApiBaseUrl() {
  const { baseUrl } = useRouteContext({ from: '__root__' })
  return baseUrl ? `${baseUrl}/api/v1` : '/api/v1'
}

function ApiKeysPage() {
  const apiKeysQuery = useSuspenseQuery(adminQueries.apiKeys())
  const apiBaseUrl = useApiBaseUrl()

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="lg:hidden">
        <BackLink to="/admin/settings">Configurações</BackLink>
      </div>
      <PageHeader
        icon={KeyIcon}
        title="Chaves de API"
        description="Gerencie chaves de API para acesso programático ao Featurepool"
      />

      <SettingsCard
        title="Chaves de API"
        description="Crie e gerencie chaves de API para autenticar na API REST do Featurepool. As chaves são exibidas apenas uma vez ao serem criadas."
      >
        <ApiKeysSettings apiKeys={apiKeysQuery.data} />
      </SettingsCard>

      <ApiUsageGuide apiBaseUrl={apiBaseUrl} />
    </div>
  )
}
