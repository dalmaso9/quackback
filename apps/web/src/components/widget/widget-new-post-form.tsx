'use client'

import { useEffect, useRef, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWidgetAuth } from './widget-auth-provider'

interface WidgetNewPostFormProps {
  boards: { id: string; name: string; slug: string }[]
  prefilledTitle?: string
  selectedBoardSlug?: string
  onSuccess: (post: {
    id: string
    title: string
    voteCount: number
    statusId: string | null
    board: { id: string; name: string; slug: string }
  }) => void
  anonymousPostingEnabled?: boolean
  hmacRequired?: boolean
}

export function WidgetNewPostForm({
  boards,
  prefilledTitle,
  selectedBoardSlug,
  onSuccess,
  anonymousPostingEnabled = false,
  hmacRequired = false,
}: WidgetNewPostFormProps) {
  const { isIdentified, user, emitEvent, metadata, ensureSession, identifyWithEmail } =
    useWidgetAuth()
  const canPost = isIdentified || anonymousPostingEnabled

  // When HMAC is on and user can't post, show the redirect gate
  if (!canPost && hmacRequired) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <p className="text-sm font-medium text-foreground">Want to share an idea?</p>
        <button
          type="button"
          onClick={() =>
            window.parent.postMessage(
              { type: 'quackback:navigate', url: `${window.location.origin}/auth/login` },
              '*'
            )
          }
          className="text-xs text-primary hover:text-primary/80 transition-colors mt-1"
        >
          Log in to submit your feedback
        </button>
      </div>
    )
  }

  const needsEmail = !isIdentified && !hmacRequired && !anonymousPostingEnabled

  const defaultBoard = selectedBoardSlug
    ? boards.find((b) => b.slug === selectedBoardSlug)
    : boards[0]

  const [boardId, setBoardId] = useState(defaultBoard?.id ?? boards[0]?.id ?? '')
  const [title, setTitle] = useState(prefilledTitle ?? '')
  const [content, setContent] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (prefilledTitle) {
        descriptionRef.current?.focus()
      } else {
        titleRef.current?.focus()
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [prefilledTitle])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !boardId || isSubmitting) return
    if (needsEmail && !email.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      if (needsEmail) {
        const identified = await identifyWithEmail(email.trim(), name.trim() || undefined)
        if (!identified) {
          setError('Could not verify your email. Please try again.')
          setIsSubmitting(false)
          return
        }
      } else if (!isIdentified) {
        const ok = await ensureSession()
        if (!ok) {
          setError('Could not create session. Please try again.')
          setIsSubmitting(false)
          return
        }
      }

      const { getWidgetAuthHeaders } = await import('@/lib/client/widget-auth')
      const { createPublicPostFn } = await import('@/lib/server/functions/public-posts')
      const result = await createPublicPostFn({
        data: {
          boardId,
          title: title.trim(),
          content: content.trim(),
          metadata: metadata ?? undefined,
        },
        headers: getWidgetAuthHeaders(),
      })

      emitEvent('post:created', {
        id: result.id,
        title: result.title,
        board: result.board,
        statusId: result.statusId ?? null,
      })

      onSuccess({
        id: result.id,
        title: result.title,
        voteCount: 0,
        statusId: result.statusId ?? null,
        board: result.board,
      })
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isValid = title.trim() && (!needsEmail || email.trim())

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 pt-1 pb-3">
          {/* Board selector — inline like portal */}
          {boards.length > 1 && (
            <div className="flex items-center pb-2">
              <span className="text-[11px] text-muted-foreground/70">Posting to</span>
              <Select value={boardId} onValueChange={setBoardId}>
                <SelectTrigger className="border-0 bg-transparent shadow-none h-auto py-0 px-1 text-[11px] font-medium text-foreground hover:text-foreground/80 focus-visible:ring-0 w-auto gap-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title — borderless, prominent */}
          <input
            ref={titleRef}
            id="widget-title"
            type="text"
            placeholder="What's your idea?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full bg-transparent text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 placeholder:font-normal border-0 outline-none caret-primary py-1"
          />

          {/* Description — borderless, subtle */}
          <textarea
            ref={descriptionRef}
            id="widget-details"
            placeholder="Add more details..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={10000}
            rows={3}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 border-0 outline-none caret-primary resize-none mt-1 leading-relaxed"
          />

          {/* Email/name — integrated with a subtle divider */}
          {needsEmail && (
            <div className="mt-2 pt-2.5 border-t border-border/40 space-y-1.5">
              <div className="relative">
                <input
                  id="widget-email"
                  type="email"
                  required
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-muted/30 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 border-0 outline-none focus:bg-muted/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              </div>
              <input
                id="widget-name"
                type="text"
                placeholder="Your name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-muted/30 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 border-0 outline-none focus:bg-muted/50 focus:ring-1 focus:ring-primary/20 transition-colors"
              />
              <p className="text-[10px] text-muted-foreground/50 px-0.5">
                We&apos;ll notify you of updates to your idea.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="px-4 py-2.5 border-t border-border/50 flex items-center justify-between shrink-0">
        <span className="text-[11px] text-muted-foreground/70 truncate mr-2">
          {user ? (
            <>
              <span className="text-foreground/80 font-medium">{user.name || user.email}</span>
            </>
          ) : needsEmail && email.trim() ? (
            <span className="text-foreground/80 font-medium">{email.trim()}</span>
          ) : needsEmail ? (
            'Enter your email'
          ) : (
            'Anonymous'
          )}
        </span>
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="px-4 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  )
}
