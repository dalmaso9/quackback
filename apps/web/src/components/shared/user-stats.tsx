'use client'

import { useQuery } from '@tanstack/react-query'
import { LightBulbIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import { ChevronUpIcon } from '@heroicons/react/24/solid'
import { getUserStatsFn } from '@/lib/server/functions/user'
import { cn } from '@/lib/shared/utils'

function StatItem({
  icon: Icon,
  value,
  label,
  compact,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: number | undefined
  label: string
  compact?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">
        <Icon
          className={
            compact ? 'w-3 h-3 text-muted-foreground/60' : 'w-3.5 h-3.5 text-muted-foreground/60'
          }
        />
        <span
          className={cn(
            'font-semibold tabular-nums text-foreground',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {value ?? '-'}
        </span>
      </div>
      <span className={cn('text-muted-foreground/60', compact ? 'text-[9px]' : 'text-[10px]')}>
        {label}
      </span>
    </div>
  )
}

interface UserStatsBarProps {
  compact?: boolean
  className?: string
  /** Auth headers for widget context (Bearer token). Portal uses cookies automatically. */
  headers?: Record<string, string>
}

export function UserStatsBar({ compact, className, headers }: UserStatsBarProps) {
  const { data } = useQuery({
    queryKey: headers ? ['widget', 'user', 'engagement-stats'] : ['user', 'engagement-stats'],
    queryFn: () => getUserStatsFn(headers ? { headers } : undefined),
    staleTime: 60 * 1000,
  })

  return (
    <div className={cn('flex items-center justify-around', className)}>
      <StatItem icon={LightBulbIcon} value={data?.ideas} label="Ideas" compact={compact} />
      <StatItem icon={ChevronUpIcon} value={data?.votes} label="Votes" compact={compact} />
      <StatItem
        icon={ChatBubbleLeftIcon}
        value={data?.comments}
        label="Comments"
        compact={compact}
      />
    </div>
  )
}
