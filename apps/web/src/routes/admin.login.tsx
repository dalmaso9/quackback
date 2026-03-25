import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { PortalAuthForm } from '@/components/auth/portal-auth-form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExclamationCircleIcon } from '@heroicons/react/24/solid'

// Error messages for login failures
const errorMessages: Record<string, string> = {
  invalid_token: 'Seu link de login é inválido ou foi alterado. Tente novamente.',
  token_expired: 'Seu link de login expirou. Solicite um novo.',
  not_team_member:
    'Esta conta não tem acesso à equipe. A entrada na equipe é somente por convite. Fale com o administrador.',
  oauth_method_not_allowed: 'Este método de entrada não está habilitado para membros da equipe.',
  password_method_not_allowed: 'O login com senha não está habilitado. Use outro método.',
}

const searchSchema = z.object({
  callbackUrl: z.string().optional(),
  error: z.string().optional(),
})

/**
 * Admin Login Page
 *
 * For team members (admin, member) to sign in to the admin dashboard.
 * Supports email OTP and any configured OAuth providers.
 */
export const Route = createFileRoute('/admin/login')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ callbackUrl: search.callbackUrl, error: search.error }),
  loader: async ({ deps, context }) => {
    // Settings already available from root context
    const { settings } = context
    if (!settings) {
      throw redirect({ to: '/onboarding' })
    }

    const { callbackUrl, error } = deps

    // Get error message if present
    const errorMessage = error && errorMessages[error]

    // Validate callbackUrl is a relative path to prevent open redirects
    const safeCallbackUrl =
      callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')
        ? callbackUrl
        : '/admin'

    // Auth config is already computed in TenantSettings (filtered by configured credentials)
    const authConfig = settings.publicAuthConfig.oauth
    const customProviderNames = settings.publicAuthConfig.customProviderNames

    return {
      errorMessage,
      safeCallbackUrl,
      authConfig,
      customProviderNames,
    }
  },
  component: AdminLoginPage,
})

function AdminLoginPage() {
  const { errorMessage, safeCallbackUrl, authConfig, customProviderNames } = Route.useLoaderData()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Entrar na equipe</h1>
          <p className="mt-2 text-muted-foreground">Entre para acessar o painel administrativo</p>
        </div>
        {errorMessage && (
          <Alert variant="destructive">
            <ExclamationCircleIcon className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        <PortalAuthForm
          mode="login"
          callbackUrl={safeCallbackUrl}
          authConfig={authConfig}
          customProviderNames={customProviderNames}
        />
      </div>
    </div>
  )
}
