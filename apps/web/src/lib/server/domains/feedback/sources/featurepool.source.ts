/**
 * Featurepool feedback source — auto-provisioned passive connector.
 *
 * One featurepool source exists per deployment. Created on startup if absent.
 * All new posts (including widget-submitted) are ingested automatically
 * via the feedback_pipeline event hook on post.created.
 */

import { db, eq, feedbackSources } from '@/lib/server/db'
import { sql } from 'drizzle-orm'
import { hashCode } from '@/lib/server/utils'

/**
 * Ensure the featurepool feedback source exists.
 * Uses an advisory lock to prevent duplicate sources from concurrent startups.
 */
export async function ensureFeaturepoolFeedbackSource(): Promise<void> {
  await db.transaction(async (tx) => {
    // Advisory lock scoped to this transaction prevents concurrent creation
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(${sql.raw(String(hashCode('featurepool_feedback_source')))})`
    )

    const existing = await tx.query.feedbackSources.findFirst({
      where: eq(feedbackSources.sourceType, 'featurepool'),
      columns: { id: true },
    })

    if (existing) {
      console.log('[FeaturepoolSource] Featurepool feedback source already exists:', existing.id)
      return
    }

    const [created] = await tx
      .insert(feedbackSources)
      .values({
        sourceType: 'featurepool',
        deliveryMode: 'passive',
        name: 'Featurepool',
        enabled: true,
        config: {},
      })
      .returning({ id: feedbackSources.id })

    console.log('[FeaturepoolSource] Created featurepool feedback source:', created.id)
  })
}
