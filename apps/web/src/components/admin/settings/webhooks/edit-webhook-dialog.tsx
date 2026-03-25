'use client'

import { useState, useTransition, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateWebhookFn } from '@/lib/server/functions/webhooks'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { CopyButton } from '@/components/shared/copy-button'
import { WarningBox } from '@/components/shared/warning-box'
import {
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_CONFIG,
} from '@/lib/server/events/integrations/webhook/constants'
import { RotateWebhookSecretDialog } from './rotate-webhook-secret-dialog'
import type { Webhook } from '@/lib/server/domains/webhooks'

interface EditWebhookDialogProps {
  webhook: Webhook
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditWebhookDialog({ webhook, open, onOpenChange }: EditWebhookDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [url, setUrl] = useState(webhook.url)
  const [selectedEvents, setSelectedEvents] = useState<string[]>(webhook.events)
  const [isEnabled, setIsEnabled] = useState(webhook.status === 'active')
  const [error, setError] = useState<string | null>(null)

  // Rotate secret state
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)

  // Reset form when webhook changes
  useEffect(() => {
    setUrl(webhook.url)
    setSelectedEvents(webhook.events)
    setIsEnabled(webhook.status === 'active')
    setError(null)
    setNewSecret(null)
  }, [webhook])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (selectedEvents.length === 0) {
      setError('Selecione pelo menos um evento')
      return
    }

    try {
      await updateWebhookFn({
        data: {
          webhookId: webhook.id,
          url,
          events: selectedEvents as (typeof WEBHOOK_EVENTS)[number][],
          status: isEnabled ? 'active' : 'disabled',
        },
      })

      startTransition(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'webhooks'] })
        router.invalidate()
      })

      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível atualizar o webhook')
    }
  }

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    )
  }

  const handleSecretRotated = (secret: string) => {
    setNewSecret(secret)
  }

  const wasAutoDisabled = webhook.status === 'disabled' && webhook.failureCount >= 50

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar webhook</DialogTitle>
            <DialogDescription>Atualize a configuração do webhook.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-url">URL do endpoint</Label>
                <Input
                  id="edit-url"
                  type="url"
                  placeholder="https://example.com/webhook"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isPending}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Eventos</Label>
                <div className="space-y-2">
                  {WEBHOOK_EVENT_CONFIG.map((event) => (
                    <label
                      key={event.id}
                      className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedEvents.includes(event.id)}
                        onCheckedChange={() => toggleEvent(event.id)}
                        disabled={isPending}
                        className="mt-0.5"
                        aria-label={`Assinar eventos de ${event.label}`}
                      />
                      <div>
                        <p className="text-sm font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label htmlFor="webhook-enabled" className="text-sm font-medium">
                    Webhook ativado
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {wasAutoDisabled
                      ? 'Reativar redefinirá a contagem de falhas'
                      : 'Webhooks desativados não receberão eventos'}
                  </p>
                </div>
                <Switch
                  id="webhook-enabled"
                  checked={isEnabled}
                  onCheckedChange={setIsEnabled}
                  disabled={isPending}
                  aria-label="Alternar webhook ativado"
                />
              </div>

              {wasAutoDisabled && (
                <WarningBox
                  variant="warning"
                  title={`Desativado automaticamente após ${webhook.failureCount} falhas`}
                  description={webhook.lastError ? `Último erro: ${webhook.lastError}` : undefined}
                />
              )}

              {/* Rotate Secret Section */}
              <div className="space-y-2">
                <Label>Segredo de assinatura</Label>
                {newSecret ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                      <code className="flex-1 text-sm font-mono break-all">{newSecret}</code>
                      <CopyButton
                        value={newSecret}
                        variant="ghost"
                        size="sm"
                        aria-label="Copiar segredo para a área de transferência"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Salve este segredo agora. Ele não será exibido novamente.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">
                      Rotacione para gerar um novo segredo de assinatura
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRotateDialogOpen(true)}
                      disabled={isPending}
                      aria-label="Rotacionar segredo de assinatura"
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1.5" />
                      Rotacionar segredo
                    </Button>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || !url || selectedEvents.length === 0}>
                {isPending ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <RotateWebhookSecretDialog
        webhook={webhook}
        open={rotateDialogOpen}
        onOpenChange={setRotateDialogOpen}
        onSecretRotated={handleSecretRotated}
      />
    </>
  )
}
