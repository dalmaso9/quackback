import { createFileRoute, notFound } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { publicChangelogQueries } from '@/lib/client/queries/changelog'
import { ChangelogEntryDetail } from '@/components/portal/changelog'
import { BackLink } from '@/components/ui/back-link'
import type { ChangelogId } from '@featurepool/ids'

export const Route = createFileRoute('/_portal/changelog/$entryId')({
  loader: async ({ context, params }) => {
    const { queryClient } = context
    const entryId = params.entryId as ChangelogId

    let entry
    try {
      entry = await queryClient.ensureQueryData(publicChangelogQueries.detail(entryId))
    } catch {
      // If entry not found or not published, throw 404
      throw notFound()
    }

    return {
      entryId,
      entryTitle: entry.title,
      workspaceName: context.settings?.name ?? 'Featurepool',
      baseUrl: context.baseUrl ?? '',
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {}
    const { entryTitle, entryId, workspaceName, baseUrl } = loaderData
    const title = `${entryTitle} - Changelog do ${workspaceName}`
    const description = `${entryTitle}. Uma atualização de produto do ${workspaceName}.`
    const canonicalUrl = baseUrl ? `${baseUrl}/changelog/${entryId}` : ''
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        ...(canonicalUrl ? [{ property: 'og:url', content: canonicalUrl }] : []),
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: canonicalUrl ? [{ rel: 'canonical', href: canonicalUrl }] : [],
    }
  },
  notFoundComponent: ChangelogNotFound,
  component: ChangelogEntryPage,
})

function ChangelogEntryPage() {
  const { entryId } = Route.useLoaderData()
  const { data: entry } = useSuspenseQuery(publicChangelogQueries.detail(entryId))

  return (
    <div className="py-8">
      <div className="animate-in fade-in duration-200 fill-mode-backwards">
        <ChangelogEntryDetail
          id={entry.id}
          title={entry.title}
          content={entry.content}
          contentJson={entry.contentJson}
          publishedAt={entry.publishedAt}
          linkedPosts={entry.linkedPosts}
        />
      </div>
    </div>
  )
}

function ChangelogNotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold mb-2">Entrada de changelog não encontrada</h1>
      <p className="text-muted-foreground mb-6">
        Esta entrada pode ter sido removida ou ainda não foi publicada.
      </p>
      <BackLink to="/changelog">Changelog</BackLink>
    </div>
  )
}
