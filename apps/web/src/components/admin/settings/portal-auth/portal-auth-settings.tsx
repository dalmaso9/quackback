import { useState, useTransition, useMemo } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  ArrowPathIcon,
  EnvelopeIcon,
  KeyIcon,
  LockClosedIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/solid'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { updatePortalConfigFn } from '@/lib/server/functions/settings'
import { AUTH_PROVIDER_ICON_MAP } from '@/components/icons/social-provider-icons'
import { AUTH_PROVIDERS } from '@/lib/server/auth/auth-providers'
import { cn } from '@/lib/shared/utils'
import { AuthProviderCredentialsDialog } from './auth-provider-credentials-dialog'
import type { PortalAuthMethods } from '@/lib/server/domains/settings'

interface PortalAuthSettingsProps {
  initialConfig: {
    oauth: PortalAuthMethods
  }
  credentialStatus: Record<string, boolean> & { _emailConfigured?: boolean }
}

export function PortalAuthSettings({ initialConfig, credentialStatus }: PortalAuthSettingsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [oauthState, setOauthState] = useState<Record<string, boolean | undefined>>(
    initialConfig.oauth
  )
  const [configDialog, setConfigDialog] = useState<{
    credentialType: string
    providerId: string
    providerName: string
    helpUrl?: string
    fields: {
      key: string
      label: string
      placeholder?: string
      sensitive: boolean
      helpText?: string
      helpUrl?: string
    }[]
  } | null>(null)
  const [search, setSearch] = useState('')

  // Sort providers: configured first, then alphabetical; filter by search
  const filteredProviders = useMemo(() => {
    const sorted = [...AUTH_PROVIDERS].sort((a, b) => {
      const aConfigured = credentialStatus[a.id] ? 1 : 0
      const bConfigured = credentialStatus[b.id] ? 1 : 0
      if (aConfigured !== bConfigured) return bConfigured - aConfigured
      return a.name.localeCompare(b.name)
    })
    if (!search.trim()) return sorted
    const query = search.toLowerCase()
    return sorted.filter((p) => p.name.toLowerCase().includes(query))
  }, [credentialStatus, search])

  const emailConfigured = credentialStatus._emailConfigured !== false

  // Count enabled auth methods to prevent disabling the last one
  const enabledMethodCount = Object.values(oauthState).filter(Boolean).length
  const isLastEnabledMethod = (providerId: string) =>
    !!oauthState[providerId] && enabledMethodCount === 1

  const saveOAuthConfig = async (oauth: Record<string, boolean | undefined>) => {
    setSaving(true)
    try {
      await updatePortalConfigFn({ data: { oauth } })
      startTransition(() => {
        router.invalidate()
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (providerId: string, checked: boolean) => {
    setOauthState((prev) => ({ ...prev, [providerId]: checked }))
    saveOAuthConfig({ [providerId]: checked })
  }

  const openConfigDialog = (provider: (typeof AUTH_PROVIDERS)[number]) => {
    // Extract helpUrl from the first field that has one (typically clientId)
    const helpUrl = provider.platformCredentials.find((f) => f.helpUrl)?.helpUrl
    setConfigDialog({
      credentialType: provider.credentialType,
      providerId: provider.id,
      providerName: provider.name,
      helpUrl,
      fields: provider.platformCredentials,
    })
  }

  return (
    <div className="space-y-8">
      {/* Password — always available, no credentials needed */}
      <div>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-foreground">Senha</h2>
          <p className="text-xs text-muted-foreground">Entrada com email e senha</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <KeyIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="password-toggle" className="font-medium cursor-pointer">
                    Senha
                  </Label>
                  {isLastEnabledMethod('password') && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <LockClosedIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Pelo menos um método de autenticação deve permanecer ativado</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Usuários entram com email e senha
                </p>
              </div>
            </div>
            <Switch
              id="password-toggle"
              checked={oauthState.password ?? true}
              onCheckedChange={(checked) => handleToggle('password', checked)}
              disabled={saving || isPending || isLastEnabledMethod('password')}
              aria-label="Autenticação por senha"
            />
          </div>
        </div>
      </div>

      {/* Email OTP — always available, no credentials needed */}
      <div>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-foreground">OTP por email</h2>
          <p className="text-xs text-muted-foreground">Entrada sem senha com códigos mágicos</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <EnvelopeIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="email-toggle" className="font-medium cursor-pointer">
                    OTP por email
                  </Label>
                  {(!emailConfigured || isLastEnabledMethod('email')) && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <LockClosedIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {!emailConfigured ? (
                              <>
                                Exige configuração de email (SMTP ou Resend).{' '}
                                <a
                                  href="https://www.featurepool.io/docs/auth/email-otp"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline"
                                >
                                  Saiba mais
                                </a>
                              </>
                            ) : (
                              'Pelo menos um método de autenticação deve permanecer ativado'
                            )}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Usuários recebem um código de 6 dígitos por email para entrar
                </p>
              </div>
            </div>
            <Switch
              id="email-toggle"
              checked={oauthState.email ?? false}
              onCheckedChange={(checked) => handleToggle('email', checked)}
              disabled={saving || isPending || !emailConfigured || isLastEnabledMethod('email')}
              aria-label="Autenticação por OTP de email"
            />
          </div>
        </div>
      </div>

      {/* OAuth Providers */}
      <div>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Provedores OAuth</h2>
            <p className="text-xs text-muted-foreground">
              Permita que usuários entrem com contas de terceiros
            </p>
          </div>
          <div className="relative w-48">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filtrar provedores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProviders.map((provider) => {
            const isConfigured = credentialStatus[provider.id]
            const isEnabled = !!oauthState[provider.id]
            const IconComponent = AUTH_PROVIDER_ICON_MAP[provider.id]

            const icon = (
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                  isConfigured ? provider.iconBg : provider.iconBg + ' opacity-60'
                )}
              >
                {IconComponent ? (
                  <IconComponent className="h-4 w-4 text-white" />
                ) : (
                  <span className="text-white font-semibold text-xs">
                    {provider.name.charAt(0)}
                  </span>
                )}
              </div>
            )

            if (!isConfigured) {
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => openConfigDialog(provider)}
                  className="group flex items-center gap-3 rounded-lg border border-dashed border-border/40 bg-muted/10 p-3 text-left transition-all hover:border-border/60"
                >
                  {icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">{provider.name}</p>
                    <div className="mt-0.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 text-muted-foreground/60 border-border/40"
                      >
                        Não configurado
                      </Badge>
                    </div>
                  </div>
                  <Cog6ToothIcon className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                </button>
              )
            }

            return (
              <div
                key={provider.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3 shadow-sm"
              >
                {icon}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{provider.name}</p>
                    {isEnabled && (
                      <Badge
                        variant="outline"
                        className="border-green-500/30 text-green-600 text-[10px] px-1.5 py-0"
                      >
                        Ativado
                      </Badge>
                    )}
                    {isLastEnabledMethod(provider.id) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <LockClosedIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Pelo menos um método de autenticação deve permanecer ativado</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openConfigDialog(provider)}
                    className="text-xs text-primary hover:underline"
                  >
                    Atualizar credenciais
                  </button>
                </div>
                <Switch
                  id={`${provider.id}-toggle`}
                  checked={isEnabled}
                  onCheckedChange={(checked) => handleToggle(provider.id, checked)}
                  disabled={saving || isPending || isLastEnabledMethod(provider.id)}
                  className="flex-shrink-0"
                />
              </div>
            )
          })}
        </div>
        {filteredProviders.length === 0 && search.trim() && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum provedor corresponde a &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {/* Saving indicator */}
      {(saving || isPending) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          <span>Salvando...</span>
        </div>
      )}

      {/* Credentials dialog */}
      {configDialog && (
        <AuthProviderCredentialsDialog
          credentialType={configDialog.credentialType}
          providerId={configDialog.providerId}
          providerName={configDialog.providerName}
          helpUrl={configDialog.helpUrl}
          fields={configDialog.fields}
          open={!!configDialog}
          onOpenChange={(open) => !open && setConfigDialog(null)}
        />
      )}
    </div>
  )
}
