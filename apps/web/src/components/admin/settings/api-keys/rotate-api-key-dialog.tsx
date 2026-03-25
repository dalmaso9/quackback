'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { WarningBox } from '@/components/shared/warning-box'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { rotateApiKeyFn } from '@/lib/server/functions/api-keys'
import type { ApiKey } from '@/lib/server/domains/api-keys'

interface RotateApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: ApiKey
  onKeyRotated: (key: ApiKey, plainTextKey: string) => void
}

export function RotateApiKeyDialog({
  open,
  onOpenChange,
  apiKey,
  onKeyRotated,
}: RotateApiKeyDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleRotate = async () => {
    setError(null)

    try {
      const result = await rotateApiKeyFn({ data: { id: apiKey.id } })

      // Invalidate queries to refresh the list
      startTransition(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'api-keys'] })
        router.invalidate()
      })

      // Notify parent with new key
      onKeyRotated(result.apiKey, result.plainTextKey)
    } catch (err) {
      console.error('Failed to rotate API key:', err)
      setError(err instanceof Error ? err.message : 'Não foi possível rotacionar a chave de API')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rotacionar chave de API</DialogTitle>
          <DialogDescription>
            Gere um novo segredo para a chave de API <strong>{apiKey.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <WarningBox
            variant="warning"
            title="A chave antiga deixará de funcionar imediatamente"
            description="Qualquer aplicação usando a chave atual perderá acesso até que você a atualize com a nova chave. O nome e as configurações da chave serão preservados."
          />

          {error && <p className="text-sm text-destructive mt-4">{error}</p>}
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
          <Button onClick={handleRotate} disabled={isPending}>
            {isPending ? 'Rotacionando...' : 'Rotacionar chave'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
