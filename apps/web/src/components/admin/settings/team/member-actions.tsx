'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  EllipsisVerticalIcon,
  ShieldCheckIcon,
  UserIcon,
  UserMinusIcon,
} from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { updateMemberRoleFn, removeTeamMemberFn } from '@/lib/server/functions/admin'

interface MemberActionsProps {
  principalId: string
  memberName: string
  memberRole: 'admin' | 'member'
  isLastAdmin: boolean
}

export function MemberActions({
  principalId,
  memberName,
  memberRole,
  isLastAdmin,
}: MemberActionsProps) {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)

  const newRole = memberRole === 'admin' ? 'member' : 'admin'
  const canChangeRole = !(memberRole === 'admin' && isLastAdmin)
  const canRemove = !(memberRole === 'admin' && isLastAdmin)

  const handleRoleChange = async () => {
    setIsLoading(true)
    try {
      await updateMemberRoleFn({ data: { principalId, role: newRole } })
      await queryClient.invalidateQueries({ queryKey: ['settings', 'team'] })
    } catch (error) {
      console.error('Failed to update role:', error)
      alert(error instanceof Error ? error.message : 'Não foi possível atualizar a função')
    } finally {
      setIsLoading(false)
      setRoleDialogOpen(false)
    }
  }

  const handleRemove = async () => {
    setIsLoading(true)
    try {
      await removeTeamMemberFn({ data: { principalId } })
      await queryClient.invalidateQueries({ queryKey: ['settings', 'team'] })
    } catch (error) {
      console.error('Failed to remove member:', error)
      alert(error instanceof Error ? error.message : 'Não foi possível remover o membro da equipe')
    } finally {
      setIsLoading(false)
      setRemoveDialogOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <EllipsisVerticalIcon className="h-4 w-4" />
            <span className="sr-only">Ações do membro</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setRoleDialogOpen(true)}
            disabled={!canChangeRole}
            className="gap-2"
          >
            {newRole === 'admin' ? (
              <>
                <ShieldCheckIcon className="h-4 w-4" />
                Tornar admin
              </>
            ) : (
              <>
                <UserIcon className="h-4 w-4" />
                Tornar membro
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setRemoveDialogOpen(true)}
            disabled={!canRemove}
            variant="destructive"
            className="gap-2"
          >
            <UserMinusIcon className="h-4 w-4" />
            Remover da equipe
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
        title={newRole === 'admin' ? 'Tornar admin?' : 'Remover privilégios de admin?'}
        description={
          newRole === 'admin' ? (
            <>
              <strong>{memberName}</strong> poderá gerenciar configurações da equipe, membros e
              todas as configurações do espaço de trabalho.
            </>
          ) : (
            <>
              <strong>{memberName}</strong> não poderá mais gerenciar configurações da equipe nem
              membros.
            </>
          )
        }
        confirmLabel={
          isLoading ? 'Atualizando...' : newRole === 'admin' ? 'Tornar admin' : 'Remover admin'
        }
        isPending={isLoading}
        onConfirm={handleRoleChange}
      />

      <ConfirmDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="Remover membro da equipe?"
        description={
          <>
            <strong>{memberName}</strong> será removido da equipe e convertido em usuário do portal.
            Ele perderá acesso ao painel administrativo, mas ainda poderá interagir com o portal de
            feedback.
          </>
        }
        variant="destructive"
        confirmLabel={isLoading ? 'Removendo...' : 'Remover da equipe'}
        isPending={isLoading}
        onConfirm={handleRemove}
      />
    </>
  )
}
