import { createFileRoute } from '@tanstack/react-router'
import { Cog6ToothIcon } from '@heroicons/react/24/solid'
import { PageHeader } from '@/components/shared/page-header'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { NotificationPreferencesForm } from '@/components/settings/notification-preferences-form'

export const Route = createFileRoute('/_portal/settings/preferences')({
  component: PreferencesPage,
})

function PreferencesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Cog6ToothIcon}
        title="Preferências"
        description="Personalize sua experiência"
        animate
      />

      {/* Appearance */}
      <div
        className="rounded-xl border border-border/50 bg-card p-6 shadow-sm animate-in fade-in duration-200 fill-mode-backwards"
        style={{ animationDelay: '75ms' }}
      >
        <h2 className="font-medium mb-1">Aparência</h2>
        <p className="text-sm text-muted-foreground mb-4">Personalize a aparência da aplicação</p>
        <div className="space-y-3">
          <p className="text-sm font-medium">Tema</p>
          <ThemeSwitcher />
        </div>
      </div>

      {/* Notifications */}
      <div
        className="rounded-xl border border-border/50 bg-card p-6 shadow-sm animate-in fade-in duration-200 fill-mode-backwards"
        style={{ animationDelay: '150ms' }}
      >
        <h2 className="font-medium mb-1">Notificações por email</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Gerencie as notificações por email dos posts que você acompanha
        </p>
        <NotificationPreferencesForm />
      </div>
    </div>
  )
}
