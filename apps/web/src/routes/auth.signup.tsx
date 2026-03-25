import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { settingsQueries } from '@/lib/client/queries/settings'
import { PortalAuthForm } from '@/components/auth/portal-auth-form'
import { DEFAULT_PORTAL_CONFIG } from '@/lib/server/domains/settings'

/**
 * Portal Signup Page
 *
 * For portal visitors to create accounts using email OTP or OAuth.
 * Creates member record with role='user' (portal users can vote/comment but not access admin).
 */
export const Route = createFileRoute('/auth/signup')({
  loader: async ({ context }) => {
    // Settings already available from root context
    const { settings, queryClient } = context
    if (!settings) {
      throw redirect({ to: '/onboarding' })
    }

    // Pre-fetch portal config using React Query
    await queryClient.ensureQueryData(settingsQueries.publicPortalConfig())

    return {}
  },
  component: SignupPage,
})

function SignupPage() {
  Route.useLoaderData()

  // Read pre-fetched data from React Query cache
  const portalConfigQuery = useSuspenseQuery(settingsQueries.publicPortalConfig())
  const portalConfig = portalConfigQuery.data
  const authConfig = portalConfig.oauth ?? DEFAULT_PORTAL_CONFIG.oauth

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Criar conta</h1>
          <p className="mt-2 text-muted-foreground">Cadastre-se para votar e comentar</p>
        </div>
        <PortalAuthForm
          mode="signup"
          callbackUrl="/"
          authConfig={authConfig}
          customProviderNames={portalConfig.customProviderNames}
        />
        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link to="/auth/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
