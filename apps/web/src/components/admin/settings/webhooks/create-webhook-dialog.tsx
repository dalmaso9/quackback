'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { SecretRevealDialog } from '@/components/shared/secret-reveal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createWebhookFn } from '@/lib/server/functions/webhooks'
import {
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_CONFIG,
} from '@/lib/server/events/integrations/webhook/constants'

interface CreateWebhookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWebhookDialog({ open, onOpenChange }: CreateWebhookDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [url, setUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Secret reveal state
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (selectedEvents.length === 0) {
      setError('Selecione pelo menos um evento')
      return
    }

    try {
      const result = await createWebhookFn({
        data: {
          url,
          events: selectedEvents as (typeof WEBHOOK_EVENTS)[number][],
        },
      })

      startTransition(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'webhooks'] })
        router.invalidate()
      })

      // Show secret reveal
      setCreatedSecret(result.secret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o webhook')
    }
  }

  const handleClose = () => {
    setUrl('')
    setSelectedEvents([])
    setError(null)
    setCreatedSecret(null)
    onOpenChange(false)
  }

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    )
  }

  // Secret reveal view
  if (createdSecret) {
    return (
      <SecretRevealDialog
        open={open}
        onOpenChange={handleClose}
        title="Webhook criado"
        description="Salve seu segredo de assinatura agora. Você não poderá vê-lo novamente."
        secretLabel="Segredo de assinatura"
        secretValue={createdSecret}
        confirmLabel="Já salvei meu segredo"
      >
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <strong>Verificação:</strong> Cada webhook inclui o cabeçalho{' '}
            <code className="bg-muted px-1 rounded">X-Featurepool-Signature</code> header.
          </p>
          <p>
            Calcule{' '}
            <code className="bg-muted px-1 rounded">HMAC-SHA256(timestamp.payload, secret)</code> e
            compare com a assinatura.
          </p>
        </div>
      </SecretRevealDialog>
    )
  }

  // Create form view
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar webhook</DialogTitle>
          <DialogDescription>
            Configure um endpoint para receber notificações de eventos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL do endpoint</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/webhook"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isPending}
                required
              />
              <p className="text-xs text-muted-foreground">Deve usar HTTPS em produção</p>
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

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !url || selectedEvents.length === 0}>
              {isPending ? 'Criando...' : 'Criar webhook'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
