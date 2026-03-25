import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { CheckCircleIcon, ArrowRightIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { checkOnboardingState } from '@/lib/server/functions/admin'
import { getSettings } from '@/lib/server/functions/workspace'

export const Route = createFileRoute('/onboarding/_layout/complete')({
  loader: async ({ context }) => {
    const { session } = context

    if (!session?.user) {
      throw redirect({ to: '/onboarding/account' })
    }

    const state = await checkOnboardingState({ data: session.user.id })

    if (state.needsInvitation) {
      throw redirect({ to: '/auth/login' })
    }

    if (!state.isOnboardingComplete) {
      if (!state.setupState?.steps?.workspace) {
        throw redirect({ to: '/onboarding/workspace' })
      }
      throw redirect({ to: '/onboarding/boards' })
    }

    const settings = await getSettings()

    return {
      workspaceName: settings?.name ?? 'Seu espaço de trabalho',
    }
  },
  component: CompleteStep,
})

function CompleteStep() {
  const navigate = useNavigate()
  const { workspaceName } = Route.useLoaderData()

  return (
    <div className="w-full max-w-md mx-auto text-center">
      {/* Success icon */}
      <div className="mb-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-500/10">
          <CheckCircleIcon className="h-10 w-10 text-green-500" />
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Tudo pronto!</h1>
        <p className="text-muted-foreground">
          {workspaceName} já está pronto para receber feedback.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3 max-w-xs mx-auto">
        <Button onClick={() => navigate({ to: '/admin' })} className="w-full h-11">
          Ir para o painel
          <ArrowRightIcon className="ml-2 h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={() => navigate({ to: '/' })} className="w-full h-11">
          Ver seu portal de feedback
        </Button>
      </div>
    </div>
  )
}
