import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { analyticsQueries, type AnalyticsPeriod } from '@/lib/client/queries/analytics'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { AnalyticsSummaryCards } from './analytics-summary-cards'
import { AnalyticsActivityChart } from './analytics-activity-chart'
import { AnalyticsStatusChart } from './analytics-status-chart'
import { AnalyticsBoardChart } from './analytics-board-chart'
import { AnalyticsChangelogCard } from './analytics-changelog-card'
import { AnalyticsTopPosts } from './analytics-top-posts'
import { AnalyticsTopContributors } from './analytics-top-contributors'

const periods: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '12m', label: '12m' },
]

export function AnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')

  const { data, isLoading } = useQuery({
    ...analyticsQueries.data(period),
    placeholderData: keepPreviousData,
  })

  const periodSelector = (
    <div className="flex items-center gap-1 rounded-lg border border-border/50 p-1">
      {periods.map(({ value, label }) => (
        <Button
          key={value}
          variant={period === value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setPeriod(value)}
        >
          {label}
        </Button>
      ))}
    </div>
  )

  if (isLoading) {
    return (
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            {periodSelector}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-60 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-5 gap-6">
            <Skeleton className="col-span-3 h-72 rounded-xl" />
            <Skeleton className="col-span-2 h-72 rounded-xl" />
          </div>
        </div>
      </ScrollArea>
    )
  }

  if (!data) return null

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            {data.computedAt && (
              <p className="text-sm text-muted-foreground">
                Last updated {formatDistanceToNow(new Date(data.computedAt), { addSuffix: true })}
              </p>
            )}
          </div>
          {periodSelector}
        </div>

        {/* KPI cards with sparklines */}
        <AnalyticsSummaryCards summary={data.summary} dailyStats={data.dailyStats} />

        {/* Activity over time */}
        <Card>
          <CardHeader>
            <CardTitle>Activity over time</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsActivityChart dailyStats={data.dailyStats} />
          </CardContent>
        </Card>

        {/* Breakdown row: status + boards + changelog */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Status distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsStatusChart data={data.statusDistribution} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Boards</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsBoardChart data={data.boardBreakdown} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Changelog views</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsChangelogCard
                topEntries={data.changelog.topEntries}
                totalViews={data.changelog.totalViews}
              />
            </CardContent>
          </Card>
        </div>

        {/* Bottom row: top posts + contributors */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Top posts</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsTopPosts posts={data.topPosts} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top contributors</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsTopContributors contributors={data.topContributors} />
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  )
}
