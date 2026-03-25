'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { deleteWebhookFn } from '@/lib/server/functions/webhooks'
import type { Webhook } from '@/lib/server/domains/webhooks'

interface DeleteWebhookDialogProps {
  webhook: Webhook
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteWebhookDialog({ webhook, open, onOpenChange }: DeleteWebhookDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setError(null)

    try {
      await deleteWebhookFn({ data: { webhookId: webhook.id } })

      startTransition(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'webhooks'] })
        router.invalidate()
      })

      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir o webhook')
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Excluir webhook"
      description="Tem certeza de que deseja excluir este webhook?"
      warning={{
        title: 'Esta ação não pode ser desfeita',
        description: (
          <>
            O webhook para <code className="bg-muted px-1 rounded text-xs">{webhook.url}</code> será
            excluído permanentemente e não receberá mais eventos.
          </>
        ),
      }}
      variant="destructive"
      confirmLabel={isPending ? 'Excluindo...' : 'Excluir webhook'}
      isPending={isPending}
      onConfirm={handleDelete}
    >
      {error && <p className="text-sm text-destructive">{error}</p>}
    </ConfirmDialog>
  )
}
