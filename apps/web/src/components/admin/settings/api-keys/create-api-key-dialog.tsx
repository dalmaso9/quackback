'use client'

import { useState, useTransition } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createApiKeyFn } from '@/lib/server/functions/api-keys'
import type { ApiKey } from '@/lib/server/domains/api-keys'

interface CreateApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onKeyCreated: (key: ApiKey, plainTextKey: string) => void
}

export function CreateApiKeyDialog({ open, onOpenChange, onKeyCreated }: CreateApiKeyDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Informe um nome para a chave de API')
      return
    }

    try {
      const result = await createApiKeyFn({ data: { name: name.trim() } })

      // Invalidate queries to refresh the list
      startTransition(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'api-keys'] })
        router.invalidate()
      })

      // Reset form and notify parent
      setName('')
      onKeyCreated(result.apiKey, result.plainTextKey)
    } catch (err) {
      console.error('Failed to create API key:', err)
      setError(err instanceof Error ? err.message : 'Não foi possível criar a chave de API')
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName('')
      setError(null)
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar chave de API</DialogTitle>
          <DialogDescription>
            Crie uma nova chave de API para autenticar na API do Featurepool.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder="ex.: API de produção, bot de integração"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Dê um nome descritivo à sua chave para identificá-la depois.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? 'Criando...' : 'Criar chave'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
