# Analytics Dashboard & Auth Cleanup Design

Three complementary refactors: consolidate anonymous user detection to a single field, stop creating user records for passive widget visitors, and build an analytics dashboard for leadership.

## 1. Auth Cleanup: Consolidate to `principal.type`

### Problem

Two fields track whether a user is anonymous:

| Field              | Table       | Set by                            |
| ------------------ | ----------- | --------------------------------- |
| `user.isAnonymous` | `user`      | Better Auth anonymous plugin      |
| `principal.type`   | `principal` | `databaseHooks.user.create.after` |

They are always derived from each other and can never diverge, but app code checks both: the client reads `user.isAnonymous` (5 places), the server reads `principal.type` (7 places).

### Design

- **Single source of truth**: `principal.type` is the canonical field. All app code reads it.
- **`user.isAnonymous` stays in the DB** -- Better Auth's anonymous plugin requires it. It becomes an implementation detail that app code never reads directly.
- **Session serialization**: `getSession` (`auth.ts`) and `getBootstrapData` (`bootstrap.ts`) currently manually cast `(session.user as Record<string, unknown>).isAnonymous`. Instead, these functions resolve the principal record and include `principal.type` in the session response.
- **Client checks migrated**: The 5 client-side reads of `session.user.isAnonymous` switch to reading from the principal type on the session.
- **Bridge point**: The `databaseHooks.user.create.after` hook continues to derive `principal.type` from `user.isAnonymous` at creation time. This is the only place `user.isAnonymous` is read.

### Files Changed

| File                                             | Change                                                                            |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `lib/server/functions/auth.ts`                   | Add `principalType` to `SessionUser` interface; resolve principal in `getSession` |
| `lib/server/functions/bootstrap.ts`              | Use principal type instead of `user.isAnonymous`                                  |
| `routes/widget.tsx`                              | Check `principalType` instead of `user.isAnonymous`                               |
| `components/public/portal-header.tsx`            | Check `principalType`                                                             |
| `components/public/comment-form.tsx`             | Check `principalType`                                                             |
| `components/public/feedback/feedback-header.tsx` | Check `principalType`                                                             |
| `components/public/auth-comments-section.tsx`    | Check `principalType`                                                             |
| `routes/api/widget/session.ts`                   | Already uses `principal.type` -- no change                                        |

### No Migration Needed

The `user.isAnonymous` column stays. No schema changes.

---

## 2. Lazy Anonymous Session Creation

### Problem

Every widget visitor gets an anonymous user record created on mount, even if they never interact. This pollutes the users table with hundreds of passive visitor records (858 users, most anonymous).

### Design

**Current flow:**

```
Widget mounts -> ensureSession() -> signIn.anonymous() -> user + principal + session created
```

**New flow:**

```
Widget mounts -> no session -> visitor browses freely
First vote/comment/post -> ensureSessionThen(action) -> signIn.anonymous() -> proceed
```

#### Widget Auth Provider Changes

- Remove the eager `signIn.anonymous()` call from the `'anonymous'` case in `widget-auth-provider.tsx`.
- The widget loads with `session = null` for unidentified visitors.
- Read-only API calls (post lists, post detail, changelog) already work without auth via public server functions. No changes needed.

#### `ensureSessionThen` Wrapper

A new utility in the widget auth context:

```ts
ensureSessionThen(callback: () => void | Promise<void>): Promise<void>
```

- If session exists, calls `callback` immediately.
- If no session, calls `signIn.anonymous()`, waits for the token to be set, then calls `callback`.
- Holds a single in-flight promise to prevent concurrent callers from creating duplicate sessions (race protection).

#### Action Components

Each write-action component calls `ensureSessionThen` before submitting:

| Component                 | Action   |
| ------------------------- | -------- |
| `widget-vote-button.tsx`  | Vote     |
| `widget-comment-form.tsx` | Comment  |
| Widget post submission    | New post |

#### What Doesn't Change

- SDK `identify()` flow -- still creates/finds the identified user immediately on message receipt.
- Portal session hydration -- still passed through SSR when user is logged into the portal.
- Merge flow -- still works when an anonymous user later identifies.
- Server-side auth checks -- still gate on `principal.type`.

#### Edge Cases

- **Rapid clicks**: The `ensureSessionThen` promise deduplication prevents double user creation.
- **Session indicator**: Widget shell shows empty state until interaction, which is fine -- anonymous users display "Anonymous" anyway.

---

## 3. Analytics Dashboard

### 3a. Data Layer: Materialized Stats Tables

Regular tables refreshed hourly by a BullMQ job. No Postgres materialized views (avoids full-refresh lock contention).

#### `analytics_daily_stats` Table

One row per day, pre-aggregated. The hourly job only recomputes today's row; historical rows are immutable.

| Column            | Type        | Description                                                                                    |
| ----------------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `date`            | `date`      | Primary key                                                                                    |
| `new_posts`       | `integer`   | Posts created on this date                                                                     |
| `new_votes`       | `integer`   | Votes cast on this date                                                                        |
| `new_comments`    | `integer`   | Comments created on this date                                                                  |
| `new_users`       | `integer`   | Non-anonymous users created on this date                                                       |
| `posts_by_status` | `jsonb`     | Current snapshot of all active posts by status: `{ "status_slug": count, ... }`                |
| `posts_by_board`  | `jsonb`     | New posts created on this date by board: `{ "board_id": count, ... }`                          |
| `posts_by_source` | `jsonb`     | New posts created on this date by source: `{ "portal": count, "widget": count, "api": count }` |
| `computed_at`     | `timestamp` | When this row was last computed                                                                |

#### `analytics_top_posts` Table

Snapshot of top posts per preset period, refreshed hourly.

| Column          | Type           | Description                       |
| --------------- | -------------- | --------------------------------- |
| `period`        | `text`         | `"7d"`, `"30d"`, `"90d"`, `"12m"` |
| `rank`          | `integer`      | 1-10                              |
| `post_id`       | `TypeID<post>` | FK to posts                       |
| `title`         | `text`         | Denormalized for display          |
| `vote_count`    | `integer`      | Votes in this period              |
| `comment_count` | `integer`      | Comments in this period           |
| `board_name`    | `text`         | Denormalized                      |
| `status_name`   | `text`         | Denormalized                      |
| `computed_at`   | `timestamp`    | When this snapshot was computed   |

Primary key: `(period, rank)`.

### 3b. BullMQ Job

New **`{analytics}`** queue:

- **Cron**: `0 * * * *` (top of every hour)
- **Concurrency**: 1
- **Job name**: `refresh-analytics`
- **Logic**:
  1. Query source tables (posts, votes, comments, users) for today's date
  2. Upsert today's row in `analytics_daily_stats`
  3. For each preset period (7d, 30d, 90d, 12m): query top 10 posts by vote count within the date range, delete + insert into `analytics_top_posts`
- **Registration**: Added to `startup.ts` alongside existing queue initializations
- **Retention**: Remove completed jobs; keep failed for 7 days
- **Retry**: 3 attempts with 2000ms exponential backoff

### 3c. API Layer

New server function: `getAnalyticsData`

**Input**: `{ period: '7d' | '30d' | '90d' | '12m' }`

**Output**:

```ts
{
  summary: {
    posts: {
      total: number
      delta: number
    } // delta = % change vs previous period
    votes: {
      total: number
      delta: number
    }
    comments: {
      total: number
      delta: number
    }
    users: {
      total: number
      delta: number
    }
  }
  dailyStats: Array<{
    date: string
    posts: number
    votes: number
    comments: number
  }>
  statusDistribution: Array<{ status: string; color: string; count: number }>
  boardBreakdown: Array<{ board: string; count: number }>
  sourceBreakdown: Array<{ source: string; count: number }>
  topPosts: Array<{
    rank: number
    postId: string
    title: string
    voteCount: number
    commentCount: number
    boardName: string
    statusName: string
  }>
  topContributors: Array<{
    principalId: string
    displayName: string
    avatarUrl: string | null
    posts: number
    votes: number
    comments: number
    total: number
  }>
  changelog: {
    totalViews: number
    totalReactions: number
  }
}
```

**Logic**:

- Reads `analytics_daily_stats` for the date range
- Computes summary totals and deltas from daily rows
- Reads `analytics_top_posts` for the matching period
- Top contributors: queried live (small result set, acceptable latency)
- Status distribution: reads `posts_by_status` from the most recent day's row (current snapshot, not summed)
- Board breakdown and source breakdown: summed from daily stats JSONB columns across the date range

**Auth**: Requires `admin` or `member` role principal.

### 3d. Admin UI

**Route**: `/admin/analytics`

**Sidebar**: New "Analytics" entry with chart icon, positioned between "Help Center" and "Users".

**Page layout**:

```
+----------------------------------------------------------+
| Analytics                          [7d] [30d] [90d] [12m] |
+----------------------------------------------------------+
| [Posts: 142 +12%] [Votes: 891 +8%] [Comments: 67 -3%] [Users: 23 +15%] |
+----------------------------------------------------------+
|                                                          |
|  Activity Over Time (LineChart)                          |
|  - Posts line (blue)                                     |
|  - Votes line (green)                                    |
|  - Comments line (orange)                                |
|                                                          |
+----------------------------+-----------------------------+
| Status Distribution        | Board Breakdown             |
| (Horizontal BarChart)      | (Horizontal BarChart)       |
| Uses status colors         |                             |
+----------------------------+-----------------------------+
| Source Breakdown            | Changelog                   |
| (PieChart)                 | Total views + reactions      |
| portal / widget / api      | in period                   |
+----------------------------+-----------------------------+
|                                                          |
|  Top Posts (Table)                                       |
|  Rank | Title | Votes | Comments | Board | Status        |
|  Rows link to post detail                                |
|                                                          |
+----------------------------------------------------------+
|                                                          |
|  Top Contributors (Table)                                |
|  Avatar | Name | Posts | Votes | Comments | Total        |
|                                                          |
+----------------------------------------------------------+
```

**Granularity**: Date x-axis uses daily ticks for 7d/30d, weekly for 90d, monthly for 12m.

**Tech**: recharts (already installed), shadcn/ui cards and tables, TanStack Query for data fetching.

### 3e. Changelog Analytics

- Add `view_count` column to the changelog entries table (integer, default 0).
- Increment on public/widget page load via a lightweight server function (fire-and-forget, no auth required).
- Reaction counts already exist on changelog entries.
- The analytics page shows aggregate changelog views + reactions for the selected period.
- Per-entry view/reaction stats are shown on the changelog admin page (future enhancement, not in this scope).

---

## Scope Summary

| Workstream       | Schema changes          | New files            | Modified files  |
| ---------------- | ----------------------- | -------------------- | --------------- |
| Auth cleanup     | None                    | None                 | ~8 files        |
| Lazy sessions    | None                    | None                 | ~4 widget files |
| Analytics tables | 2 new tables + 1 column | Migration file       | Schema index    |
| Analytics job    | None                    | Queue + worker file  | `startup.ts`    |
| Analytics API    | None                    | Server function file | None            |
| Analytics UI     | None                    | Route + components   | Admin sidebar   |

## Ordering

1. **Auth cleanup** first -- unblocks cleaner session checks in the widget
2. **Lazy sessions** second -- depends on the auth cleanup for consistent `principal.type` checks
3. **Analytics** third -- independent but benefits from the reduced anonymous user noise
