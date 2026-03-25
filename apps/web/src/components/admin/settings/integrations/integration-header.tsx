import type { ReactNode } from 'react'
import { BackLink } from '@/components/ui/back-link'
import { Badge } from '@/components/ui/badge'
import { DocsLink } from '@/components/ui/docs-link'
import type { IntegrationCatalogEntry } from '@/lib/server/integrations/types'

interface IntegrationHeaderProps {
  catalog: IntegrationCatalogEntry
  status?: 'active' | 'paused' | 'pending' | null
  workspaceName?: string | null
  icon?: ReactNode
  actions?: ReactNode
}

export function IntegrationHeader({
  catalog,
  status,
  workspaceName,
  icon,
  actions,
}: IntegrationHeaderProps) {
  const isConnected = status === 'active'
  const isPaused = status === 'paused'

  return (
    <>
      <BackLink to="/admin/settings/integrations">Integrações</BackLink>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${catalog.iconBg}`}
          >
            {icon ?? <span className="text-white font-bold text-lg">{catalog.name.charAt(0)}</span>}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{catalog.name}</h1>
              {isConnected && (
                <Badge variant="outline" className="border-green-500/30 text-green-600">
                  Ativa
                </Badge>
              )}
              {isPaused && (
                <Badge variant="outline" className="border-yellow-500/30 text-yellow-600">
                  Pausada
                </Badge>
              )}
              {!status && !catalog.available && catalog.configurable && (
                <Badge variant="outline" className="text-muted-foreground/60 border-border/40">
                  Não configurada
                </Badge>
              )}
              {!status && !catalog.available && !catalog.configurable && (
                <Badge variant="outline" className="text-muted-foreground/60 border-border/40">
                  Em breve
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{catalog.description}</p>
            {catalog.docsUrl && (
              <DocsLink href={catalog.docsUrl} className="mt-1 text-xs">
                Veja como configurar {catalog.name}
              </DocsLink>
            )}
            {workspaceName && (
              <p className="mt-1 text-xs text-muted-foreground">
                Conectada a <span className="font-medium">{workspaceName}</span>
              </p>
            )}
          </div>
        </div>

        {actions}
      </div>
    </>
  )
}
