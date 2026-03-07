# Nexus Foundation Rework — Technical Design

**Status:** Draft — Technical Design for Phases 1-4

**Related PRD:** [nexus-foundation.md](nexus-foundation.md)

**Scope Note:** This document covers the platform foundation work required before Quiet Mode. Quiet Mode itself is explicitly out of scope here.

**Decision Status:** This design assumes a clean refactor path. Existing data does not need to be migrated or preserved. New platform primitives should replace the current execution and destination models rather than wrapping them.

## 1. Purpose

This document translates the foundation PRD into a technical design for the first four phases of work:

1. platform model definition
2. storage and tracking refactor
3. connector model cleanup
4. migration of the existing meeting-summary flow onto the new foundation

The target outcome is not a rewrite. The target outcome is a set of stable architectural boundaries that let Nexus support multiple sources, multiple workflows, and multiple destinations without continuing to hardcode product behavior around Google Drive transcripts and meeting summaries.

## 2. Current System Snapshot

The current system has one main pipeline:

1. Google Drive webhook signals a file change.
2. Nexus resolves the user from a push channel.
3. Nexus enqueues transcript processing through QStash.
4. A worker fetches the transcript, calls OpenRouter, and writes summary output to `JobHistory`.
5. Nexus fans the result out to database, Slack DM, and connector destinations.

This works, but several technical seams are currently overloaded:

- `JobHistory` mixes workflow execution tracking with artifact persistence.
- `resultPayload` stores the core product output, but the product output has no first-class identity outside the job record.
- destinations are split across legacy delivery providers and the newer connector abstraction.
- the current connector abstraction is outbound-oriented and should not be stretched to represent inbound source systems.
- there is no general model for normalized source events or source items.

## 3. Design Goals

### 3.1 Core Goals

- Introduce platform primitives that are independent of a single provider and a single workflow.
- Separate inbound source integration from outbound destination integration.
- Promote produced outputs to first-class artifacts.
- Generalize execution tracking from transcript jobs to workflow runs.
- Preserve the existing product capability while allowing destructive schema refactors during implementation.

### 3.2 Constraints

- The existing Google Drive meeting-summary flow is the reference product behavior to rebuild on the new platform foundation.
- Existing persisted data is not important and may be wiped.
- The design may prefer replacement over compatibility when that yields a cleaner architecture.
- Prisma remains the system of record.
- QStash and Vercel cron remain available orchestration tools unless later research suggests a replacement.

## 3.3 Locked Decisions

The following design decisions are now considered chosen unless a later ADR reverses them:

- `WorkflowRun` replaces `JobHistory` as the execution record model.
- `DestinationConnection` replaces `UserConnectorConfig` as the outbound connection model.
- meeting-summary artifacts move out of execution records and into first-class `Artifact` records.
- the refactor can use a clean schema reset rather than compatibility migration.
- source and destination providers are modeled as separate contracts.

## 4. Non-Goals

This design does not include:

- Quiet Mode schema or processing design
- multi-provider chat ingestion details
- final user-facing UX redesign
- marketplace-style plugin loading
- runtime-loaded third-party extensions

## 5. Target Platform Model

Nexus should move toward six core technical domains:

- source connections
- source events
- source items
- workflow runs
- artifacts
- artifact deliveries

These domains should be represented in storage, services, and interfaces.

## 6. Proposed Domain Model

The following model names are recommended. The exact Prisma field list can still be refined during implementation.

### 6.1 SourceConnection

Represents a user-authorized inbound connection.

Examples:

- Google Drive source connection
- Fireflies source connection
- Slack source connection

Recommended fields:

- `id`
- `userId`
- `provider`
- `status`
- `configJson`
- `oauthTokensEncrypted`
- `externalAccountId`
- `externalWorkspaceId`
- `displayName`
- `lastValidatedAt`
- `createdAt`
- `updatedAt`

Notes:

- This should not be merged conceptually with destination connection state.
- Some providers may need multiple connection records per user.

### 6.2 DestinationConnection

Represents a user-authorized outbound connection.

Examples:

- Slack DM destination
- ClickUp destination
- future Notion destination

Recommended fields:

- `id`
- `userId`
- `provider`
- `status`
- `enabled`
- `configJson`
- `oauthTokensEncrypted`
- `externalAccountId`
- `externalWorkspaceId`
- `displayName`
- `lastValidatedAt`
- `createdAt`
- `updatedAt`

Notes:

- This is the chosen replacement for `UserConnectorConfig`.
- `DATABASE` or Nexus History should be modeled as a system destination rather than forcing OAuth semantics onto it.

### 6.3 SourceEvent

Represents an inbound signal from a provider.

Examples:

- file changed
- transcript ready
- message received
- watch renewal required

Recommended fields:

- `id`
- `userId`
- `sourceConnectionId`
- `provider`
- `eventType`
- `externalEventId`
- `dedupeKey`
- `rawPayload`
- `normalizedMetadata`
- `status`
- `receivedAt`
- `processedAt`
- `errorMessage`

Notes:

- This record is for ingestion and orchestration, not for long-term artifact storage.
- A single source event may map to zero, one, or many source items.

### 6.4 SourceItem

Represents normalized content that can be processed by a workflow.

Examples:

- transcript file reference
- transcript body snapshot
- message event
- channel thread snapshot

Recommended fields:

- `id`
- `userId`
- `sourceConnectionId`
- `provider`
- `itemType`
- `externalItemId`
- `title`
- `contentText`
- `contentJson`
- `sourceUrl`
- `occurredAt`
- `metadata`
- `createdAt`
- `updatedAt`

Notes:

- For Google Drive, the initial `SourceItem` can hold transcript identity and fetch metadata rather than duplicating the entire file body immediately.
- `contentText` should be optional because not every item is text-first.

### 6.5 WorkflowRun

Represents one execution of a workflow.

Examples:

- meeting-summary generation
- artifact redelivery
- scheduled digest compilation

Recommended fields:

- `id`
- `userId`
- `workflowType`
- `triggerType`
- `status`
- `inputRefJson`
- `sourceEventId`
- `startedAt`
- `completedAt`
- `attemptCount`
- `modelUsed`
- `errorMessage`
- `metricsJson`
- `createdAt`

Notes:

- This is the chosen replacement for `JobHistory`.
- It should capture execution state, not be the long-term home of the artifact payload.

### 6.6 Artifact

Represents a durable Nexus output.

Examples:

- meeting summary
- future quiet digest

Recommended fields:

- `id`
- `userId`
- `artifactType`
- `workflowRunId`
- `title`
- `summaryText`
- `payloadJson`
- `sourceRefsJson`
- `status`
- `createdAt`
- `updatedAt`

Notes:

- `payloadJson` is acceptable as long as the artifact itself is first-class and typed by `artifactType`.
- The artifact should be queryable independently from execution logs.

### 6.7 ArtifactDelivery

Represents the result of delivering one artifact to one destination.

Recommended fields:

- `id`
- `artifactId`
- `destinationConnectionId`
- `provider`
- `status`
- `externalId`
- `externalUrl`
- `retryCount`
- `errorMessage`
- `deliveredAt`
- `createdAt`

Notes:

- This is the chosen replacement for `DeliveryLog`.
- A provider string should remain denormalized here for reporting and debugging.

## 7. Canonical Enumerations

The platform should standardize a small set of enums.

Recommended enums:

- `SourceProvider`: `GOOGLE_DRIVE`, `FIREFLIES`, `SLACK`, `TEAMS`, `DISCORD`, `OTHER`
- `DestinationProvider`: `NEXUS_HISTORY`, `SLACK`, `CLICKUP`, `NOTION`, `EMAIL`, `OTHER`
- `WorkflowType`: `MEETING_SUMMARY`, `ARTIFACT_REDELIVERY`, `SCHEDULED_DIGEST`, `OTHER`
- `ArtifactType`: `MEETING_SUMMARY`, `DIGEST`, `TASK_BRIEF`, `OTHER`
- `RunStatus`: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELED`
- `ConnectionStatus`: `CONNECTED`, `DISCONNECTED`, `EXPIRED`, `ERROR`
- `EventStatus`: `RECEIVED`, `NORMALIZED`, `QUEUED`, `PROCESSED`, `FAILED`, `IGNORED`
- `DeliveryStatus`: `PENDING`, `DELIVERED`, `FAILED`, `SKIPPED`

These should be kept intentionally small. Provider-specific nuance should stay in metadata, not enum sprawl.

## 8. Interface Design

The current connector abstraction should split into explicit inbound and outbound contracts.

### 8.1 SourceProvider Contract

Purpose:

- represent inbound source systems
- normalize provider events
- fetch or hydrate source items

Responsibilities:

- validate connection state
- verify inbound webhook or poll response authenticity
- resolve inbound events to a Nexus connection
- convert raw provider payloads into canonical `SourceEvent`
- fetch or build `SourceItem` records when needed

Suggested conceptual methods:

- `getConnectionStatus()`
- `verifyIncomingRequest()`
- `resolveConnection()`
- `normalizeEvent()`
- `buildSourceItems()`

Notes:

- Not every source will use webhooks.
- Polling-based providers should still fit this contract through scheduled ingestion.

### 8.2 DestinationProvider Contract

Purpose:

- represent outbound delivery targets
- transform canonical artifacts into provider-specific outputs

Responsibilities:

- validate destination configuration
- ensure authentication state is usable
- render provider-specific output from a canonical artifact
- perform delivery and return delivery metadata

Suggested conceptual methods:

- `getConnectionStatus()`
- `validateConfig()`
- `renderArtifact()`
- `deliverArtifact()`

Notes:

- This can replace the current mixed legacy-plus-connector delivery split over time.

### 8.3 WorkflowHandler Contract

Purpose:

- define how a workflow consumes inputs and produces an artifact

Responsibilities:

- declare accepted input shape
- create or update a `WorkflowRun`
- invoke AI or deterministic processing
- emit an `Artifact`
- request delivery according to configured destination rules

Suggested conceptual methods:

- `canHandle()`
- `prepareInputs()`
- `execute()`
- `buildArtifact()`
- `getDeliveryPlan()`

Notes:

- This is the missing middle layer in the current system.

## 9. Service Boundaries

To avoid mixing concerns, the application should converge on a small number of service domains.

Recommended domains:

- `src/lib/sources/`
- `src/lib/workflows/`
- `src/lib/artifacts/`
- `src/lib/destinations/`
- `src/lib/orchestration/`

### 9.1 Sources Domain

Owns provider-specific ingestion, event normalization, and source-item hydration.

### 9.2 Workflows Domain

Owns workflow handlers and workflow execution logic.

### 9.3 Artifacts Domain

Owns artifact creation, retrieval, indexing, and transformation utilities.

### 9.4 Destinations Domain

Owns provider-specific delivery implementations and delivery planning.

### 9.5 Orchestration Domain

Owns enqueueing, scheduling, retries, dead-letter behavior, and execution coordination.

## 10. Storage Strategy

The storage refactor should optimize for architectural clarity rather than backward compatibility.

Recommended approach:

1. define the new canonical tables first
2. reset local and non-critical data as needed
3. rebuild the meeting-summary flow directly on the new tables
4. remove obsolete tables and helper paths instead of maintaining bridges

This reduces long-term complexity and avoids carrying transitional models into the future architecture.

## 11. Replacement Mapping From Current Models

The following mappings are recommended.

### 11.1 `PushChannel`

Current role:

- Google Drive-specific source connection state

Migration direction:

- replace with `SourceConnection` plus provider-specific source metadata

### 11.2 `UserConnectorConfig`

Current role:

- destination connection state for ClickUp and parts of Slack

Migration direction:

- replace with `DestinationConnection`

### 11.3 `JobHistory`

Current role:

- transcript processing run tracking plus output payload storage

Migration direction:

- replace with `WorkflowRun`
- move payload responsibility to `Artifact`

### 11.4 `DeliveryLog`

Current role:

- per-destination outcome for summary delivery

Migration direction:

- replace with `ArtifactDelivery`

## 12. Orchestration Model

Nexus currently uses both QStash and Vercel cron. That is acceptable, but orchestration should be expressed through one internal model.

Recommended orchestration principles:

- all async work should execute as a `WorkflowRun`
- all scheduled work should create concrete run records before execution
- retries should update the same run where possible or create a linked retry run where necessary
- dead-letter entries should reference the failed run and its input references

### 12.1 Event-Driven Execution

Examples:

- Google Drive file change
- future webhook-driven transcript source

Flow:

1. ingest provider event
2. create `SourceEvent`
3. create or resolve `SourceItem`
4. enqueue workflow execution
5. create `WorkflowRun`
6. create `Artifact`
7. deliver to configured destinations

### 12.2 Scheduled Execution

Examples:

- future digest compilation
- connection refresh tasks

Flow:

1. scheduler identifies due work
2. scheduler creates `WorkflowRun`
3. workflow loads its canonical inputs
4. workflow creates artifact and deliveries

For phases 1-4, the scheduled model only needs to be structurally supported. It does not need full product implementation beyond existing cron uses.

## 13. Artifact-Centric Delivery Design

The delivery layer should stop depending on workflow-specific payload contracts such as meeting-summary-only output.

Recommended rule:

- destination providers receive an `Artifact` plus typed rendering context

The artifact contract should be stable enough that a provider can decide:

- whether it supports that artifact type
- how to render it
- which external fields to store after delivery

This change is necessary to avoid cloning the delivery system when a second artifact type is added.

## 14. Meeting Summary As The First Migrated Workflow

The existing meeting-summary flow should become the reference implementation for the new foundation.

### 14.1 Target Future Shape

Google Drive meeting summaries should eventually look like this:

1. Google Drive source provider ingests change signal.
2. Nexus creates a `SourceEvent`.
3. Nexus resolves or creates a `SourceItem` for the transcript file.
4. Nexus starts a `WorkflowRun` of type `MEETING_SUMMARY`.
5. Workflow processing generates a `MEETING_SUMMARY` artifact.
6. Destination planning selects Nexus History and any enabled destinations.
7. Destination providers create `ArtifactDelivery` records.

### 14.2 Why Use Meeting Summaries First

- it is the current production use case
- it already exercises ingestion, AI processing, storage, and delivery
- it is a controlled way to validate the new platform model before adding new source types

## 15. Phase-by-Phase Technical Plan

### Phase 1: Platform Model Definition

Deliverables:

- finalized domain vocabulary
- provider boundary definitions
- workflow boundary definitions
- artifact boundary definitions
- repository and service structure decisions

Technical decisions to lock:

- final names for the new domain entities
- source and destination connections remain separate tables
- old execution and destination abstractions are replaced rather than adapted

Recommended outputs:

- architecture decision record for source versus destination contracts
- canonical enum definitions
- repository helper conventions for new models

Exit criteria:

- the team can describe the future Google Drive meeting-summary flow end to end using the new platform vocabulary
- there is no unresolved ambiguity about whether a concern belongs to source, workflow, artifact, or destination layers

### Phase 2: Storage and Tracking Refactor

Deliverables:

- canonical storage models for workflow runs, artifacts, and deliveries
- replacement plan for current job and destination records
- schema reset plan for non-critical existing data

Technical decisions to lock:

- `WorkflowRun` supersedes `JobHistory`
- `ArtifactDelivery` supersedes `DeliveryLog`
- artifact storage is fully first-class rather than backfilled into execution records

Recommended implementation direction:

- introduce `WorkflowRun`, `Artifact`, and `ArtifactDelivery` as the canonical models
- rebuild repository helpers against the new schema directly
- remove old write paths once the meeting-summary flow is functional on the new model

Exit criteria:

- a meeting summary is represented only through `WorkflowRun`, `Artifact`, and `ArtifactDelivery`
- the system can trace one workflow run to one artifact and multiple deliveries

### Phase 3: Connector Model Cleanup

Deliverables:

- explicit source provider contract
- explicit destination provider contract
- separate registries or discovery mechanisms
- refactored Slack and ClickUp delivery integrations under the destination-provider model

Technical decisions to lock:

- whether to keep the word `connector` at all or replace it with `source provider` and `destination provider`
- where OAuth token helpers should live after the split
- how system destinations like Nexus History participate in the destination layer

Recommended implementation direction:

- keep provider registration simple and static
- move provider-specific code behind clearer contracts
- rebuild Slack and ClickUp delivery on the destination-provider model before adding future source providers

Exit criteria:

- inbound provider logic and outbound provider logic no longer share one misleading interface
- the system can register and resolve providers by role cleanly

### Phase 4: Migrate Existing Meeting Summary Flow

Deliverables:

- Google Drive represented as a source provider
- meeting summary represented as a workflow
- meeting summary output represented as an artifact
- current destinations delivered via artifact-centric delivery

Technical decisions to lock:

- the meeting-summary flow reads and writes only through the new foundation
- UI read models should be updated to the new artifact and workflow structures
- legacy helper functions are deleted rather than kept as adapters where practical

Recommended implementation direction:

- rebuild the Google Drive workflow end to end on the new foundation
- then update query helpers and UI consumers to the new canonical models
- then delete obsolete legacy paths

Exit criteria:

- the production meeting-summary flow runs on the new foundation
- adding a second summary source no longer requires redesigning the core pipeline

## 16. Cutover Strategy

The preferred implementation approach is direct cutover, not long-lived compatibility.

Recommended cutover tactics:

- keep only the minimal route surface needed to preserve product behavior
- rebuild route handlers on top of the new source, workflow, artifact, and destination services
- reset non-critical persisted data instead of supporting data migrations
- delete legacy helper paths as soon as equivalent behavior exists on the new model

This should minimize long-term maintenance burden and keep the architecture coherent.

## 17. Observability Requirements

The new foundation should improve traceability across the pipeline.

Minimum observability requirements:

- every inbound signal should have a durable source event identity
- every workflow execution should have a workflow run identity
- every artifact should have a durable artifact identity
- every delivery attempt should be attributable to one artifact and one destination
- logs should include provider, user, workflow type, artifact type, and run status

This is required both for debugging and for future admin tooling.

## 18. Testing Strategy

Testing should evolve with the platform boundaries.

Recommended test layers:

- unit tests for source normalization
- unit tests for workflow handlers
- unit tests for artifact renderers and destination adapters
- integration tests for end-to-end Google Drive meeting-summary flow on the new architecture
- integration tests for destination delivery using `DestinationConnection`

For phases 1-4, the most important requirement is proving that the rebuilt meeting-summary flow works cleanly on the new foundation.

## 19. Risks and Mitigations

### 19.1 Too Much Abstraction

Risk:

- the design becomes framework-heavy and slows shipping

Mitigation:

- keep abstractions driven by two real use cases only: meeting summaries and future Quiet Mode

### 19.2 Incomplete Cutover

Risk:

- old and new models coexist longer than intended

Mitigation:

- make replacement boundaries explicit before implementation begins
- delete legacy code promptly once replacement behavior is verified

### 19.3 Slack Delivery Legacy Complexity

Risk:

- Slack remains half-legacy and contaminates the new destination boundary

Mitigation:

- explicitly prioritize Slack cleanup during phase 3 rather than postponing it

### 19.4 Overloading Artifact Payloads

Risk:

- `payloadJson` becomes an unstructured dump that reproduces current coupling problems

Mitigation:

- keep `artifactType` strict
- define typed serializers and renderers per artifact type

## 20. Recommended Immediate Next Decisions

Before implementation starts, the following should be decided explicitly:

1. What exact Prisma schema should `WorkflowRun`, `Artifact`, and `ArtifactDelivery` use for the first cut?
2. What exact Prisma schema should `DestinationConnection` use, including system destinations like Nexus History?
3. Should `PushChannel` remain a provider-specific implementation detail under `SourceConnection`, or be collapsed immediately into generic source tables?
4. What minimum artifact schema is sufficient for meeting summaries without prematurely optimizing for future artifact types?
5. What naming does the team want to standardize on: `provider`, `connector`, `source`, `destination`, or a mix?

## 21. Recommendation

Proceed with phases 1 through 4 before designing or implementing Quiet Mode.

The key technical move is to make meeting summaries the first workload migrated onto a more general platform model. If that migration is successful, Nexus will have a stable base for future source types, artifact types, and destination types. If it is skipped, Quiet Mode is likely to create a second architecture inside the same app.