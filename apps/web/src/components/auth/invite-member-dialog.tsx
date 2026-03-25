import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { CheckCircleIcon, CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/solid'
import { inviteSchema, type InviteInput } from '@/lib/shared/schemas/auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/shared/form-error'
import { useCopyToClipboard } from '@/lib/client/hooks/use-copy-to-clipboard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { sendInvitationFn } from '@/lib/server/functions/admin'

function InviteLinkView({
  inviteLink,
  email,
  onClose,
}: {
  inviteLink: string
  email: string
  onClose: () => void
}) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        O envio de email não está configurado. Copie o link de convite abaixo e compartilhe com{' '}
        <span className="font-medium text-foreground">{email}</span>.
      </p>

      <div className="rounded-lg border bg-muted/50 p-3">
        <code className="block break-all font-mono text-xs text-muted-foreground leading-relaxed">
          {inviteLink}
        </code>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => copy(inviteLink)}>
          {copied ? (
            <>
              <CheckIcon className="h-4 w-4" />
              Copiado!
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="h-4 w-4" />
              Copiar link do convite
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onClose}>
          Concluir
        </Button>
      </div>
    </div>
  )
}

interface InviteMemberDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function InviteMemberDialog({ open, onClose, onSuccess }: InviteMemberDialogProps) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const form = useForm<InviteInput>({
    resolver: standardSchemaResolver(inviteSchema),
    defaultValues: {
      email: '',
      name: '',
      role: 'member',
    },
  })

  async function onSubmit(data: InviteInput) {
    setError('')

    try {
      const result = await sendInvitationFn({ data })

      setSuccess(true)
      onSuccess?.()

      if (result.emailSent === false && result.inviteLink) {
        setInviteLink(result.inviteLink)
      } else {
        form.reset()
        setTimeout(() => {
          setSuccess(false)
          onClose()
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o convite')
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      form.reset()
      setError('')
      setSuccess(false)
      setInviteLink(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convidar membro da equipe</DialogTitle>
        </DialogHeader>

        {success ? (
          inviteLink ? (
            <InviteLinkView
              inviteLink={inviteLink}
              email={form.getValues('email')}
              onClose={() => handleOpenChange(false)}
            />
          ) : (
            <div className="py-8 flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                <CheckCircleIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-lg font-semibold text-foreground">Convite enviado!</div>
              <p className="mt-2 text-sm text-muted-foreground text-center">
                {form.getValues('email')} receberá um email com instruções para entrar.
              </p>
            </div>
          )
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && <FormError message={error} />}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="João da Silva"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço de email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="colleague@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="member">
                          Membro - Pode visualizar e criar feedback
                        </SelectItem>
                        <SelectItem value="admin">
                          Admin - Pode gerenciar configurações e membros
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Enviando...' : 'Enviar convite'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
