# Nexus Foundation Rework — Execution Plan

**Status:** Ready for Execution

**Scope:** This plan covers phases 1 through 4 of the Nexus foundation refactor. It does not include Quiet Mode design or implementation.

**Primary Goal:** Rebuild the current Google Drive meeting-summary pipeline on top of the new foundation so Nexus is ready for future source types, destination types, and workflow types.

## 1. Required Reading Before Starting

Read these documents in order before writing code:

1. [nexus-foundation.md](nexus-foundation.md)
2. [nexus-foundation-technical-design.md](nexus-foundation-technical-design.md)
3. [docs/architecture/adr/0001-workflow-run-replaces-job-history.md](docs/architecture/adr/0001-workflow-run-replaces-job-history.md)
4. [docs/architecture/adr/0002-destination-connection-replaces-user-connector-config.md](docs/architecture/adr/0002-destination-connection-replaces-user-connector-config.md)
5. [docs/architecture/adr/0003-clean-slate-foundation-cutover.md](docs/architecture/adr/0003-clean-slate-foundation-cutover.md)
6. [docs/ai-context/overview.md](docs/ai-context/overview.md)

Do not begin implementation before these decisions are understood:

- `WorkflowRun` replaces `JobHistory`
- `DestinationConnection` replaces `UserConnectorConfig`
- `ArtifactDelivery` replaces `DeliveryLog`
- existing data can be wiped
- source and destination providers are separate contracts

## 2. Target Outcome

At the end of this job, the application should support the current meeting-summary product behavior using a new foundation built around these core models:

- `SourceConnection`
- `SourceEvent`
- `SourceItem`
- `WorkflowRun`
- `Artifact`
- `ArtifactDelivery`
- `DestinationConnection`

The Google Drive meeting-summary flow should operate as:

1. Google Drive emits an inbound signal.
2. Nexus creates a `SourceEvent`.
3. Nexus resolves or creates a `SourceItem`.
4. Nexus creates a `WorkflowRun` of type `MEETING_SUMMARY`.
5. Nexus generates an `Artifact` of type `MEETING_SUMMARY`.
6. Nexus delivers the artifact through configured `DestinationConnection` records.
7. The UI reads meeting summaries from the new foundation, not the legacy job-centric model.

## 3. Non-Negotiable Implementation Rules

These rules should be followed throughout the refactor:

1. Do not preserve legacy schema or helper paths just because they already exist.
2. Do not build new features on top of `JobHistory`, `UserConnectorConfig`, or `DeliveryLog`.
3. Do not design for Quiet Mode in code yet. Only design the foundation it will need.
4. Keep source concerns, workflow concerns, artifact concerns, and destination concerns separate.
5. Prefer deleting obsolete code over adding compatibility glue.
6. Treat Google Drive meeting summaries as the proving workflow for the new platform.

## 4. Suggested Branching and Working Method

Recommended working mode:

1. Work on a dedicated branch for the foundation refactor.
2. Land the work in small logical PRs or commits, even if the final merge is one larger branch.
3. Keep the execution plan updated if scope shifts.
4. Validate behavior after each work package, not only at the end.

Suggested implementation order:

1. schema and enum definitions
2. repository and service layer scaffolding
3. source provider layer
4. workflow layer
5. artifact and destination delivery layer
6. Google Drive meeting-summary integration
7. UI read model updates
8. legacy code deletion

## 5. Phase Overview

### Phase 1

Define and lock the platform model in code structure and naming.

### Phase 2

Implement the new persistence layer and execution tracking primitives.

### Phase 3

Implement the provider split and normalize outbound delivery.

### Phase 4

Rebuild the existing Google Drive meeting-summary workflow end to end on the new foundation.

## 6. File and Folder Areas Expected To Change

The engineer taking this work should expect to touch or replace code in these areas.

### Schema and generated client

- [prisma/schema.prisma](prisma/schema.prisma)
- [prisma/migrations](prisma/migrations)
- [src/generated/prisma](src/generated/prisma)

### Current execution and delivery logic likely to be replaced

- [src/lib/db/scoped-queries.ts](src/lib/db/scoped-queries.ts)
- [src/lib/destinations/router.ts](src/lib/destinations/router.ts)
- [src/lib/ai/process-meeting.ts](src/lib/ai/process-meeting.ts)
- [src/app/api/workers/process-transcript/route.ts](src/app/api/workers/process-transcript/route.ts)
- [src/lib/queue/enqueue.ts](src/lib/queue/enqueue.ts)

### Current provider logic likely to be rehomed or rewritten

- [src/lib/connectors](src/lib/connectors)
- [src/lib/destinations](src/lib/destinations)
- [src/lib/google](src/lib/google)
- [src/app/api/webhooks/google-drive/route.ts](src/app/api/webhooks/google-drive/route.ts)
- [src/app/api/auth/slack](src/app/api/auth/slack)
- [src/app/api/auth/clickup](src/app/api/auth/clickup)

### UI and query consumers likely to be updated

- [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx)
- [src/app/dashboard/history/page.tsx](src/app/dashboard/history/page.tsx)
- [src/app/dashboard/notes/page.tsx](src/app/dashboard/notes/page.tsx)
- [src/app/dashboard/settings/page.tsx](src/app/dashboard/settings/page.tsx)
- [src/components/dashboard](src/components/dashboard)
- [src/hooks/use-note-modal.ts](src/hooks/use-note-modal.ts)

### Test areas expected to grow

- [src/tests](src/tests)
- [vitest.config.ts](vitest.config.ts)

## 7. Phase 1 — Platform Model Definition

## 7.1 Objective

Create the final platform vocabulary, code boundaries, and directory layout so the implementation does not drift back into provider-specific or workflow-specific coupling.

## 7.2 Deliverables

- finalized model names in the Prisma schema plan
- finalized enum names
- final service boundaries
- new folder structure for sources, workflows, artifacts, and destinations
- explicit provider contracts for inbound and outbound integrations

## 7.3 Tasks

1. Confirm the final canonical nouns used throughout the codebase.
   Required nouns:
   - `SourceConnection`
   - `SourceEvent`
   - `SourceItem`
   - `WorkflowRun`
   - `Artifact`
   - `ArtifactDelivery`
   - `DestinationConnection`

2. Confirm the canonical enums.
   Required enums:
   - `SourceProvider`
   - `DestinationProvider`
   - `WorkflowType`
   - `ArtifactType`
   - `RunStatus`
   - `ConnectionStatus`
   - `EventStatus`
   - `DeliveryStatus`

3. Define the new code layout.
   Recommended target structure:
   - `src/lib/sources/`
   - `src/lib/workflows/`
   - `src/lib/artifacts/`
   - `src/lib/destinations/`
   - `src/lib/orchestration/`

4. Define the interfaces.
   Required contracts:
   - `SourceProvider`
   - `DestinationProvider`
   - `WorkflowHandler`

5. Decide what stays provider-specific.
   These can remain provider-specific implementation details:
   - Google Drive watch semantics
   - Slack OAuth details
   - ClickUp configuration lookup
   - provider-specific metadata payloads

6. Decide what must be provider-neutral.
   These must be provider-neutral:
   - workflow execution records
   - artifact records
   - delivery records
   - source event normalization
   - destination planning

## 7.4 Acceptance Criteria

- the team can explain the full Google Drive meeting-summary pipeline using only the new vocabulary
- no new design ambiguity remains about what is a source concern versus a destination concern
- implementation directories and file naming conventions are agreed before schema work begins

## 7.5 Common Failure Modes

- keeping the word `connector` everywhere even after the split
- letting `Artifact` become another anonymous JSON bag attached to a run
- creating a workflow abstraction that still knows too much about delivery implementation details

## 8. Phase 2 — Storage and Tracking Refactor

## 8.1 Objective

Replace the legacy execution and outbound storage model with the new canonical persistence model.

## 8.2 Deliverables

- updated Prisma schema with the new foundation models
- regenerated Prisma client
- repository helpers for all new models
- initial deletion plan for legacy tables and queries

## 8.3 Required Schema Work

Create or replace models for:

1. `SourceConnection`
2. `DestinationConnection`
3. `SourceEvent`
4. `SourceItem`
5. `WorkflowRun`
6. `Artifact`
7. `ArtifactDelivery`

Decide whether `PushChannel` remains temporarily as a Google Drive implementation detail or whether its fields collapse into `SourceConnection`-owned metadata in the first cut.

Recommended rule:

- keep provider-specific fields in JSON only when they are not operationally queried
- do not hide core routing and status fields inside JSON blobs

## 8.4 Suggested Schema Responsibilities

### `SourceConnection`

Should own:

- user mapping
- provider identity
- auth and connection state
- external account or workspace metadata

### `DestinationConnection`

Should own:

- user mapping
- provider identity
- enabled state
- auth and delivery configuration

### `SourceEvent`

Should own:

- inbound signal identity
- dedupe key
- normalized event state
- raw payload for debugging

### `SourceItem`

Should own:

- normalized content identity
- provider item identity
- content and metadata references

### `WorkflowRun`

Should own:

- workflow identity
- trigger type
- execution state
- attempts
- model metadata
- run-level errors

### `Artifact`

Should own:

- artifact identity
- artifact type
- stable structured payload
- source references
- user-facing title or label

### `ArtifactDelivery`

Should own:

- artifact-to-destination delivery state
- external ID and URL
- retry count
- delivery errors

## 8.5 Repository Layer Tasks

Implement new repository helpers or query services for:

1. source connection lookup and update
2. destination connection lookup and update
3. source event create and dedupe lookup
4. source item create, upsert, and query
5. workflow run create, update, failure, and completion
6. artifact create and query
7. artifact delivery create, update, retry, and query

Do not bolt these onto the old helper naming if the old names are job-specific. Rename the repository layer to fit the new model.

## 8.6 Delete or Deprioritize Legacy Models

The following should be considered replacement targets, not extension points:

- `JobHistory`
- `DeliveryLog`
- `UserConnectorConfig`

If `PushChannel` remains, it should be treated as a temporary Google Drive detail, not as a platform primitive.

## 8.7 Validation Steps

1. run Prisma format and migration generation
2. regenerate the Prisma client
3. verify TypeScript imports compile against the new generated client
4. run tests that cover repository helpers and schema assumptions

## 8.8 Acceptance Criteria

- no new write path depends on `JobHistory`, `DeliveryLog`, or `UserConnectorConfig`
- the new schema can fully represent one meeting-summary run and its deliveries
- repository helpers exist for all core new models

## 9. Phase 3 — Provider Split and Delivery Cleanup

## 9.1 Objective

Separate inbound and outbound provider responsibilities and rebuild the outbound delivery path around `DestinationConnection` and `ArtifactDelivery`.

## 9.2 Deliverables

- `SourceProvider` contract and registry
- `DestinationProvider` contract and registry
- normalized Slack and ClickUp outbound providers
- system destination provider for Nexus History

## 9.3 Tasks

1. Create `SourceProvider` abstractions.
   Required concerns:
   - connection validation
   - request verification
   - event normalization
   - source item creation or hydration

2. Create `DestinationProvider` abstractions.
   Required concerns:
   - connection validation
   - artifact rendering
   - outbound delivery
   - external URL and ID reporting

3. Normalize current outbound providers.
   Rebuild these under the new destination model:
   - Slack DM
   - ClickUp
   - Nexus History

4. Move OAuth and token helpers to the correct ownership boundary.
   Suggested direction:
   - source-side auth helpers under `src/lib/sources/`
   - destination-side auth helpers under `src/lib/destinations/`

5. Remove ambiguous provider terminology where practical.
   Preferred language:
   - `source provider`
   - `destination provider`
   - `source connection`
   - `destination connection`

## 9.4 Special Notes For Slack and ClickUp

### Slack

- Slack should be treated as a destination in this phase, not a source.
- The current Slack delivery path should be rewritten to deliver artifacts, not meeting-summary-specific payloads.
- `DestinationConnection` should store the connection state required for Slack delivery.

### ClickUp

- ClickUp should stay outbound-only in this phase.
- The existing ClickUp destination behavior should be preserved, but the implementation should target artifacts and destination connections.

### Nexus History

- Model Nexus History as a system destination provider.
- It should not require OAuth tokens.
- It should still participate in artifact delivery planning and `ArtifactDelivery` tracking.

## 9.5 Validation Steps

1. verify each destination can report connection validity
2. verify each destination can accept a canonical artifact contract
3. verify artifact deliveries are logged consistently regardless of provider
4. run focused tests for Slack, ClickUp, and Nexus History providers

## 9.6 Acceptance Criteria

- outbound delivery is driven by `DestinationConnection` and `ArtifactDelivery`
- Slack, ClickUp, and Nexus History all implement the same destination-side contract
- no inbound provider logic shares the outbound delivery contract

## 10. Phase 4 — Rebuild Google Drive Meeting Summaries On The New Foundation

## 10.1 Objective

Replace the current Google Drive meeting-summary flow with a workflow built entirely on the new source, workflow, artifact, and destination layers.

## 10.2 Deliverables

- Google Drive source provider implementation
- meeting-summary workflow handler implementation
- artifact creation for meeting summaries
- destination planning and delivery execution for meeting-summary artifacts
- updated APIs and UI reads using the new model

## 10.3 Required Flow To Implement

The target end-to-end flow should be:

1. Google Drive webhook route receives a push notification.
2. Source provider verifies the request.
3. Source provider resolves the user and source connection.
4. Source provider creates a `SourceEvent`.
5. Source provider creates or resolves a `SourceItem` for the transcript.
6. Orchestration layer enqueues a `MEETING_SUMMARY` workflow run.
7. Worker creates a `WorkflowRun`.
8. Workflow fetches transcript content.
9. Workflow calls OpenRouter.
10. Workflow validates structured AI output.
11. Workflow creates an `Artifact` of type `MEETING_SUMMARY`.
12. Destination planner resolves enabled destinations.
13. Destination providers deliver the artifact.
14. `ArtifactDelivery` records are written for each destination.
15. `WorkflowRun` is marked completed or failed.

## 10.4 Code Work Packages

### Work Package A — Source ingestion

Tasks:

1. refactor Google Drive webhook handling into a source-provider-oriented path
2. create normalized source event write path
3. create transcript source item write path
4. define dedupe behavior at the source event layer

Primary files likely affected:

- [src/app/api/webhooks/google-drive/route.ts](src/app/api/webhooks/google-drive/route.ts)
- [src/lib/google](src/lib/google)
- new files under `src/lib/sources/`

### Work Package B — Workflow execution

Tasks:

1. create a meeting-summary workflow handler
2. move AI orchestration behind the workflow handler
3. create run start, completion, and failure writes through `WorkflowRun`

Primary files likely affected:

- [src/lib/ai/process-meeting.ts](src/lib/ai/process-meeting.ts)
- [src/lib/ai/openrouter-client.ts](src/lib/ai/openrouter-client.ts)
- [src/app/api/workers/process-transcript/route.ts](src/app/api/workers/process-transcript/route.ts)
- new files under `src/lib/workflows/`

### Work Package C — Artifact creation and delivery

Tasks:

1. convert validated meeting-summary output into canonical artifact payloads
2. create artifact persistence helpers
3. resolve enabled destination connections
4. deliver via destination providers
5. persist artifact delivery records

Primary files likely affected:

- [src/lib/destinations/router.ts](src/lib/destinations/router.ts)
- [src/lib/destinations](src/lib/destinations)
- [src/lib/connectors](src/lib/connectors)
- new files under `src/lib/artifacts/`

### Work Package D — Read path and UI conversion

Tasks:

1. identify all UI reads that assume `JobHistory`
2. replace them with queries over `WorkflowRun`, `Artifact`, and `ArtifactDelivery`
3. update filters and detail views to map to the new model
4. ensure the note modal and dashboard views still work for meeting summaries

Primary files likely affected:

- [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx)
- [src/app/dashboard/history/page.tsx](src/app/dashboard/history/page.tsx)
- [src/app/dashboard/notes/page.tsx](src/app/dashboard/notes/page.tsx)
- [src/components/dashboard](src/components/dashboard)
- [src/hooks/use-note-modal.ts](src/hooks/use-note-modal.ts)

### Work Package E — Legacy deletion

Tasks:

1. delete obsolete job-centric repository helpers
2. delete obsolete delivery-log-specific helpers
3. remove old connector abstractions that conflict with the new provider split
4. remove dead code paths after replacement behavior is verified

This work should happen before the refactor is considered complete.

## 10.5 Validation Steps

Run these validations before marking phase 4 complete:

1. user can still trigger and process a meeting summary from Google Drive
2. automatic Google Drive webhook flow creates a source event and a workflow run
3. successful runs create a meeting-summary artifact
4. enabled destinations receive deliveries
5. failed deliveries create retriable delivery records
6. dashboard, notes, history, and modal detail views render correctly from the new model
7. settings still allow users to configure the current meeting-summary destinations

## 10.6 Acceptance Criteria

- Google Drive meeting-summary processing no longer depends on the legacy job-centric architecture
- the new foundation is the system of record for execution, artifacts, and deliveries
- the existing meeting-summary product behavior is restored on the new platform model

## 11. Suggested Implementation Checklist

Use this as the operational checklist.

### Preparation

- read all design documents
- confirm branch and environment setup
- confirm schema reset is acceptable
- inventory all files still reading legacy models

### Phase 1 complete when

- model names are locked
- directory layout is locked
- provider contracts are defined

### Phase 2 complete when

- Prisma schema reflects the new canonical models
- repository helpers exist for all new models
- legacy write paths are not being extended

### Phase 3 complete when

- source providers and destination providers are separate
- Slack, ClickUp, and Nexus History use the new destination model

### Phase 4 complete when

- Google Drive meeting summaries run on the new foundation
- UI reads from the new model
- obsolete legacy code has been removed

## 12. Testing Plan

The engineer executing this should not treat tests as cleanup work at the end. Testing is part of each phase.

### Unit tests required

- source event normalization
- source item creation rules
- workflow handler execution behavior
- artifact serialization and validation
- destination provider rendering and delivery result mapping

### Integration tests required

- Google Drive webhook to workflow-run creation
- workflow-run to artifact creation
- artifact delivery to Slack
- artifact delivery to ClickUp
- artifact delivery to Nexus History

### Regression checks required

- dashboard recent meetings
- history listing and filters
- note detail modal
- destination retry behavior
- settings-driven delivery toggles

## 13. Operational Commands Likely Needed

The exact commands may vary, but the expected toolchain includes:

1. Prisma schema formatting and migration generation
2. Prisma client generation
3. test execution with Vitest
4. linting and TypeScript validation through the existing project scripts

Before closing the work, ensure the equivalent of the following has been run successfully:

- Prisma schema update flow
- Prisma client regeneration
- lint
- test suite relevant to the changed layers

## 14. Recommended Definition of Done

This refactor should only be considered complete when all of the following are true:

1. `WorkflowRun` is the canonical execution record used by the meeting-summary flow.
2. `DestinationConnection` is the canonical outbound connection record.
3. `Artifact` is the canonical stored meeting-summary output.
4. `ArtifactDelivery` tracks delivery outcomes for all current destinations.
5. source-side logic and destination-side logic no longer share one connector abstraction.
6. Google Drive meeting summaries work end to end.
7. the dashboard, notes, history, and detail experiences work from the new data model.
8. legacy job-centric and destination-config-centric code paths that conflict with the new architecture have been removed.

## 15. Explicit Out-Of-Scope Reminder

Do not include these in this job unless the scope is formally expanded:

- Quiet Mode design or implementation
- Slack or Teams as inbound message sources
- Fireflies source implementation
- new destination integrations beyond current product behavior
- broad UI redesign unrelated to the data model refactor

## 16. Final Guidance To The Engineer Taking This Work

The most important judgment call in this refactor is resisting the urge to preserve old abstractions.

If a choice comes down to:

- keeping a familiar legacy path alive
- or making the new platform boundary cleaner

the correct default for this job is to favor the cleaner platform boundary.

The success condition is not that the old architecture remains recognizable. The success condition is that the current meeting-summary product behavior works on a foundation that is ready for future source types, destination types, and workflow types.