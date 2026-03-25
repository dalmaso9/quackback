import { createFileRoute, Link, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { FormError } from '@/components/shared/form-error'
import { ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/solid'
import { authClient } from '@/lib/server/auth/client'

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || '',
    error: (search.error as string) || '',
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token, error: urlError } = useSearch({ from: '/auth/reset-password' })
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(
    urlError === 'INVALID_TOKEN' ? 'Este link de redefinição é inválido ou expirou.' : ''
  )
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Token de redefinição ausente. Use o link enviado para o seu email.')
      return
    }
    if (newPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    try {
      const result = await authClient.resetPassword({
        newPassword,
        token,
      })
      if (result.error) {
        throw new Error(result.error.message || 'Não foi possível redefinir a senha')
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível redefinir a senha')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-8 px-4 text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Senha redefinida</h1>
          <p className="text-muted-foreground">Sua senha foi atualizada com sucesso.</p>
          <Link to="/auth/login">
            <Button className="w-full">Entrar</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Defina uma nova senha</h1>
          <p className="mt-2 text-muted-foreground">Digite sua nova senha abaixo.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <FormError message={error} />}

          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium">
              Nova senha
            </label>
            <Input
              id="new-password"
              type="password"
              placeholder="Pelo menos 8 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading || !token}
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium">
              Confirmar senha
            </label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Digite sua senha novamente"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || !token}
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            disabled={
              loading || !token || newPassword.length < 8 || newPassword !== confirmPassword
            }
            className="w-full"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                Redefinindo senha...
              </>
            ) : (
              'Redefinir senha'
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/auth/login" className="font-medium text-primary hover:underline">
            Voltar para entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
