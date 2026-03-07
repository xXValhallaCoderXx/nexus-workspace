# Google Drive / Notes Improvement Plan

## Summary

I reviewed the current Notes page flow and, yes, we are refetching the visible Google Drive list each time the Notes view loads. More precisely, the app currently fetches the first page of Google Docs from Drive on every Notes page load, filters that page down to transcript-like files in our code, then performs a workflow-status lookup for those file IDs.

That means the current implementation is simple, but it is not very efficient and it does not scale well as the transcript library grows.

## Current behavior

### Files involved

- `src/components/dashboard/drive-files-panel.tsx`
- `src/app/api/user/drive/files/route.ts`
- `src/lib/google/fetch-transcript.ts`
- `src/lib/db/scoped-queries.ts`
- `src/app/api/webhooks/google-drive/route.ts`

### Current request flow

1. `/dashboard/notes` renders `DriveFilesPanel`.
2. `DriveFilesPanel` runs `fetch("/api/user/drive/files")` in a `useEffect` on mount.
3. `/api/user/drive/files` calls `listTranscriptFiles(session.user.id)`.
4. `listTranscriptFiles()` calls `drive.files.list(...)` with:
   - `q: "mimeType='application/vnd.google-apps.document' and trashed=false"`
   - `orderBy: "modifiedTime desc"`
   - `pageSize: 100`
   - no `pageToken`
5. The app then filters that response locally with `isLikelyTranscript()` using filename patterns like `transcript`, `meeting`, and `notes`.
6. The route looks up workflow status for the returned file IDs via `getWorkflowRunStatusByFileIds()`.
7. The merged list is returned to the client and then searched/filtered client-side.

## Key findings

### 1. We refetch the list on every Notes page load

The Notes page currently does a fresh GET request every time the page mounts, and again after manual refresh or after a process/retry action.

This is not the full Drive library, but it is the full first page used by the Notes UI every time. For users with fewer than 100 relevant docs, that is effectively the whole visible list.

### 2. There is no pagination today

`listTranscriptFiles()` hard-codes `pageSize: 100` and does not accept or return a Drive `pageToken`.

As a result:

- older transcripts beyond that first page are inaccessible
- power users will see an incomplete Notes library
- the UI has no way to request more results

### 3. Filtering happens after the Drive API call

The Drive query fetches recent Google Docs first, then our code filters them down to likely transcripts.

This has two downsides:

- we spend Drive/API work on non-transcript docs
- if a user has many newer Google Docs that are not meeting transcripts, transcripts can be pushed out of the first page and never shown

### 4. Status lookup work scales with the fetched list size

`getWorkflowRunStatusByFileIds()` builds a large Prisma `OR` clause against `inputRefJson.fileId`.

That is workable for small lists, but it becomes less attractive as page sizes or transcript counts increase. It is also unnecessary work if we continue sending large unpaginated batches.

### 5. We already have a useful local index path

The Google Drive webhook flow already stores Drive change state and upserts `SourceItem` rows for detected transcript files.

That means a future DB-first Notes list is possible, even though the current page still reads directly from Drive on every visit.

## Constraints

- Keep current business logic intact.
- Do not change transcript processing behavior.
- Focus on efficiency, pagination, and safer data loading.
- Preserve the current Notes UX expectations: browse, filter, refresh, process, retry, and open detail.

## Improvement options

### Option A: Add short-lived caching to `/api/user/drive/files`

**What to change**

- Add a short private cache window for the list endpoint.
- Possible approaches:
  - HTTP caching headers (`Cache-Control: private, max-age=60...300`)
  - a small user-scoped server cache
  - lightweight client deduplication for repeated navigations

**Pros**

- quickest efficiency win
- reduces repeated Drive API calls for back/forward navigation and multi-tab usage
- no business-logic changes

**Cons**

- list/status can be slightly stale for a short window
- refresh/process flows need to bypass or invalidate the cache cleanly

**Recommendation**

Good quick win, but it should not be the only improvement because it does not solve the 100-item ceiling.

### Option B: Add cursor pagination to the Drive list API

**What to change**

- Extend `listTranscriptFiles()` to accept `pageToken` and optionally `pageSize`
- Return `{ files, nextPageToken }` from `/api/user/drive/files`
- Update the Notes page to support `Load more` or paged navigation
- Only fetch workflow status for the current page of file IDs

**Pros**

- removes the current first-page-only limitation
- reduces per-request work
- gives us a clear path to scale the Notes page
- does not change business logic

**Cons**

- the UI needs pagination state
- client-side search/filter behavior must be defined:
  - search only the loaded pages, or
  - move search/filtering server-side later

**Recommendation**

This is the best first implementation step.

### Option C: Improve transcript selectivity before or during listing

**What to change**

- Try to narrow the Drive query further if the transcript naming pattern is reliable enough
- Or, if query-side filtering is too brittle, continue paging through Drive until enough transcript matches are collected for a page

**Pros**

- avoids wasting the first page on non-transcript docs
- makes the Notes list more accurate

**Cons**

- transcript naming may not be consistent enough for a strict query-only filter
- “fill a page with transcript matches” can require multiple Drive calls

**Recommendation**

Worth exploring, but I would treat it as a follow-up optimization rather than the first change.

### Option D: Optimize the workflow status lookup

**What to change**

- Keep the status lookup page-scoped
- Replace the large `OR` tree with either:
  - a batched strategy, or
  - a more direct query against the JSON `fileId`
- Longer term, consider normalizing the source file ID into a more query-friendly shape

**Pros**

- reduces database work
- makes pagination safer at larger scale

**Cons**

- less visible user impact than pagination/caching
- may require a slightly more deliberate query design

**Recommendation**

Do this after pagination, unless profiling shows it is already a bottleneck.

### Option E: Move to a DB-first Notes list

**What to change**

- Read the Notes list primarily from `SourceItem` and related workflow data
- Use Drive webhooks and manual sync/refresh to keep the local index fresh
- Fall back to direct Drive reads only when needed

**Pros**

- most efficient long-term architecture
- reduces dependency on live Drive listing for every page visit
- aligns the Notes page with the rest of the app’s event-driven model

**Cons**

- larger architectural change
- likely needs a clearer definition of freshness, missing items, and metadata completeness
- may require storing more Drive metadata locally

**Recommendation**

Best long-term direction, but not necessary for the first improvement pass.

## Recommended phased plan

### Phase 1: Pagination first

1. Add `pageToken` support to `listTranscriptFiles()`
2. Update `/api/user/drive/files` to accept pagination params and return `nextPageToken`
3. Update `DriveFilesPanel` to use a `Load more` pattern
4. Limit workflow status lookup to only the current page

**Why first:** this solves the biggest functional gap and immediately reduces the size of each request.

### Phase 2: Add short-lived caching/deduplication

1. Add short private caching to `/api/user/drive/files`
2. Keep the existing Refresh button as an explicit fresh fetch path
3. After Process/Retry, refetch the active page so the UI remains accurate

**Why second:** this reduces repeated quota usage without changing any core behavior.

### Phase 3: Tighten correctness and scale

1. Review how to avoid wasting page slots on non-transcript docs
2. Improve the status lookup query shape
3. Decide whether a DB-first Notes list is worth the added complexity

## Suggested implementation files

- `src/lib/google/fetch-transcript.ts`
- `src/app/api/user/drive/files/route.ts`
- `src/components/dashboard/drive-files-panel.tsx`
- `src/lib/db/scoped-queries.ts`

## Recommended next step

If we implement this, I would start with:

1. cursor pagination in the API
2. a `Load more` Notes UI
3. status lookup only for the current page
4. then a short-lived private cache on the list endpoint

That gives the best efficiency improvement with minimal product and business-logic risk.
