import { useState, useEffect, useCallback } from 'react'
import { Switch } from '@/components/ui/switch'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
import {
  getNotificationPreferencesFn,
  updateNotificationPreferencesFn,
} from '@/lib/server/functions/user'
interface Preferences {
  emailStatusChange: boolean
  emailNewComment: boolean
}

export function NotificationPreferencesForm() {
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch preferences on mount
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const result = await getNotificationPreferencesFn()
        setPreferences(result as Preferences)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível carregar as preferências')
      } finally {
        setLoading(false)
      }
    }
    fetchPreferences()
  }, [])

  // Update a single preference
  const updatePreference = useCallback(
    async (key: keyof Preferences, value: boolean) => {
      if (!preferences) return

      setSaving(key)
      setError(null)

      // Optimistic update
      setPreferences((prev) => (prev ? { ...prev, [key]: value } : prev))

      try {
        const result = await updateNotificationPreferencesFn({
          data: {
            [key]: value,
          },
        })

        setPreferences(result as Preferences)
      } catch (err) {
        // Revert on error
        setPreferences((prev) => (prev ? { ...prev, [key]: !value } : prev))
        setError(err instanceof Error ? err.message : 'Não foi possível salvar a preferência')
      } finally {
        setSaving(null)
      }
    },
    [preferences]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !preferences) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  if (!preferences) {
    return null
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Status change emails */}
      <div className="flex items-center justify-between py-2">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Atualizações de status</p>
          <p className="text-xs text-muted-foreground">
            Receba uma notificação quando o feedback que você acompanha mudar de status
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving === 'emailStatusChange' && (
            <ArrowPathIcon className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Switch
            checked={preferences.emailStatusChange}
            onCheckedChange={(checked) => updatePreference('emailStatusChange', checked)}
            disabled={saving !== null}
          />
        </div>
      </div>

      {/* New comment emails */}
      <div className="flex items-center justify-between py-2">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Novos comentários</p>
          <p className="text-xs text-muted-foreground">
            Receba uma notificação quando alguém comentar em um feedback que você acompanha
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving === 'emailNewComment' && (
            <ArrowPathIcon className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Switch
            checked={preferences.emailNewComment}
            onCheckedChange={(checked) => updatePreference('emailNewComment', checked)}
            disabled={saving !== null}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground pt-2">
        Você passa a seguir automaticamente os posts que cria, vota ou comenta. Use o sino em cada
        post para gerenciar assinaturas individuais.
      </p>
    </div>
  )
}
