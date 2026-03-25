'use client'

import { SecretRevealDialog } from '@/components/shared/secret-reveal-dialog'

interface ApiKeyRevealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  keyValue: string | null
  keyName: string
  onClose?: () => void
}

export function ApiKeyRevealDialog({
  open,
  onOpenChange,
  keyValue,
  keyName,
  onClose,
}: ApiKeyRevealDialogProps) {
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onClose?.()
    }
    onOpenChange(newOpen)
  }

  return (
    <SecretRevealDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Chave de API criada"
      description={
        <>
          Sua chave de API <strong>{keyName}</strong> foi criada com sucesso.
        </>
      }
      secretLabel="Sua chave de API"
      secretValue={keyValue}
      confirmLabel="Já salvei minha chave"
    >
      {/* Usage example */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Uso</label>
        <div className="rounded-lg bg-muted p-3">
          <code className="text-xs text-muted-foreground block">
            curl -H &quot;Authorization: Bearer {keyValue ? keyValue.slice(0, 20) + '...' : ''}
            &quot; \
            <br />
            &nbsp;&nbsp;https://yoursite.com/api/v1/posts
          </code>
        </div>
      </div>
    </SecretRevealDialog>
  )
}
