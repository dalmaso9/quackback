'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { revokeApiKeyFn } from '@/lib/server/functions/api-keys'
import type { ApiKey } from '@/lib/server/domains/api-keys'

interface RevokeApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: ApiKey
}

export function RevokeApiKeyDialog({ open, onOpenChange, apiKey }: RevokeApiKeyDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleRevoke = async () => {
    setError(null)

    try {
      await revokeApiKeyFn({ data: { id: apiKey.id } })

      startTransition(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'api-keys'] })
        router.invalidate()
      })

      onOpenChange(false)
    } catch (err) {
      console.error('Failed to revoke API key:', err)
      setError(err instanceof Error ? err.message : 'Não foi possível revogar a chave de API')
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Revogar chave de API"
      description={
        <>
          Tem certeza de que deseja revogar a chave de API <strong>{apiKey.name}</strong>?
        </>
      }
      warning={{
        title: 'Essa ação não pode ser desfeita',
        description:
          'Todos os aplicativos que usam esta chave perderão acesso à API imediatamente. Você precisará criar uma nova chave e atualizar suas integrações.',
      }}
      variant="destructive"
      confirmLabel={isPending ? 'Revogando...' : 'Revogar chave'}
      isPending={isPending}
      onConfirm={handleRevoke}
    >
      {error && <p className="text-sm text-destructive">{error}</p>}
    </ConfirmDialog>
  )
}
