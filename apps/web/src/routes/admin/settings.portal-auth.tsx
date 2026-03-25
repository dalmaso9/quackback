import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { settingsQueries } from '@/lib/client/queries/settings'
import { adminQueries } from '@/lib/client/queries/admin'
import { LockClosedIcon } from '@heroicons/react/24/solid'
import { BackLink } from '@/components/ui/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { PortalAuthSettings } from '@/components/admin/settings/portal-auth/portal-auth-settings'
import { SettingsCard } from '@/components/admin/settings/settings-card'

export const Route = createFileRoute('/admin/settings/portal-auth')({
  loader: async ({ context }) => {
    // Settings is validated in root layout
    // Only owners and admins can access portal auth settings (more restrictive than parent)
    const { requireWorkspaceRole } = await import('@/lib/server/functions/workspace-utils')
    await requireWorkspaceRole({ data: { allowedRoles: ['admin'] } })

    const { queryClient } = context

    await Promise.all([
      queryClient.ensureQueryData(settingsQueries.portalConfig()),
      queryClient.ensureQueryData(adminQueries.authProviderStatus()),
    ])

    return {}
  },
  component: PortalAuthPage,
})

function PortalAuthPage() {
  const portalConfigQuery = useSuspenseQuery(settingsQueries.portalConfig())
  const credentialStatusQuery = useSuspenseQuery(adminQueries.authProviderStatus())

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="lg:hidden">
        <BackLink to="/admin/settings">Configurações</BackLink>
      </div>
      <PageHeader
        icon={LockClosedIcon}
        title="Autenticação"
        description="Configure como visitantes podem entrar no seu portal público de feedback"
      />

      {/* Authentication Methods */}
      <SettingsCard
        title="Métodos de entrada"
        description="Escolha quais métodos de autenticação estarão disponíveis para usuários do portal. Configure provedores OAuth adicionando as credenciais do seu app."
      >
        <PortalAuthSettings
          initialConfig={{ oauth: portalConfigQuery.data.oauth }}
          credentialStatus={credentialStatusQuery.data}
        />
      </SettingsCard>
    </div>
  )
}
