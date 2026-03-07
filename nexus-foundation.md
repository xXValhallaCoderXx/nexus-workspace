# PRD: Nexus Foundation Rework

**Status:** Draft — For Research and Architecture Validation

**Product:** Nexus

**Document Purpose:** Define the foundational rework required to evolve Nexus from a Google Meet transcript processor with additive delivery into a platform-agnostic intelligence pipeline that can support multiple input sources, multiple output destinations, and multiple workflow types.

## 1. Summary

Nexus should not continue growing around a single source assumption or a single artifact type.

Today, the product is optimized for one primary workflow:

1. Google Drive detects a new meeting transcript.
2. Nexus fetches and summarizes the transcript.
3. Nexus stores the summary and optionally delivers it to Slack or ClickUp.

That model works for the current meeting-summary use case, but it will become brittle if we add:

- non-Google meeting sources such as Fireflies or other transcript providers
- non-meeting inputs such as Slack, Teams, or Discord notifications
- new artifact types such as triage digests, task rollups, or follow-up briefs
- additional destinations beyond Slack and ClickUp

Before implementing omnichannel Quiet Mode or adding new source systems, Nexus should establish a more durable foundation that separates:

- source ingestion
- canonical normalization
- workflow processing
- artifact storage
- destination delivery
- scheduling and orchestration

This PRD describes that foundational rework.

## 2. Problem Statement

The current system is effective for a narrow workflow, but key product capabilities are still coupled to specific assumptions:

- source assumptions are tied to Google Drive push channels and transcript files
- processing assumptions are tied to one artifact type: meeting summaries
- connector abstractions are primarily outbound, not symmetrical for inbound and outbound integration
- delivery assumptions are partly split between legacy destinations and the newer connector framework
- scheduling assumptions differ by workflow, with cron and QStash used for different purposes without a unified orchestration model

If Nexus adds Quiet Mode, additional summary sources, or new delivery targets on top of the current foundation, the codebase is likely to accumulate parallel, special-case pipelines rather than a coherent platform model.

## 3. Objective

Rework the Nexus foundation so the application can support, over time:

- multiple input sources
- multiple workflow types
- multiple output destinations
- both inbound and outbound integrations
- user-specific scheduling and orchestration rules
- a canonical internal data model that is not specific to Google Drive, Slack, ClickUp, or any single use case

The goal is not to build every future integration now. The goal is to define and implement the platform boundaries that let future integrations plug into Nexus without reworking the core each time.

## 4. Product Goals

### 4.1 Primary Goals

- Make Nexus source-agnostic enough to support future meeting sources beyond Google Drive.
- Make Nexus workflow-agnostic enough to support both meeting summaries and notification triage digests.
- Make Nexus destination-agnostic enough to support future delivery outputs without workflow-specific delivery hacks.
- Replace use-case-specific coupling with explicit platform primitives.
- Reduce the amount of application logic that must change when adding a new source or destination.

### 4.2 Secondary Goals

- Standardize how jobs, retries, failures, and delivery outcomes are tracked across workflows.
- Standardize how external identities and provider connections map back to a Nexus user.
- Create a cleaner separation between provider-specific logic and core product logic.

## 5. Non-Goals

This foundation work does not require shipping all future features immediately.

Out of scope for this PRD:

- implementing all source integrations now
- implementing all destination integrations now
- building Quiet Mode end to end in the same milestone
- solving every provider-specific edge case up front
- supporting arbitrary user-authored workflow logic
- building a public integration marketplace in V1

## 6. Why This Rework Is Needed Before Quiet Mode

Quiet Mode is not just another destination feature. It introduces a fundamentally different product shape:

- the source is inbound chat activity, not a transcript file in Google Drive
- the processing unit is a notification event or digest window, not a meeting transcript
- scheduling is user-defined and recurring, not only event-driven or fixed cron
- the output artifact is a triage digest, not a meeting summary

If Quiet Mode is built directly into the current foundation, Nexus risks ending up with two parallel systems:

- one system for meeting summaries
- one system for notification digests

That is the wrong long-term direction. The better direction is to create shared platform primitives first, then implement Quiet Mode as one workflow on top of them.

## 7. Current State Constraints

Based on the current application architecture, Nexus has the following structural constraints:

- Google Drive is the only inbound source pipeline.
- Meeting summary generation is the dominant core workflow.
- The current `Connector` abstraction is mainly designed for outbound delivery.
- Slack still exists partly as a legacy delivery path rather than a full connector model.
- Delivery routing is optimized for meeting summaries and additive destinations.
- Job tracking is centered on transcript processing rather than arbitrary workflow runs.
- There is no first-class concept of a canonical inbound event, canonical source record, or canonical artifact record shared across workflows.

These are acceptable for the current product stage, but they should not be treated as the target architecture.

## 8. Product Principles

The foundation rework should follow these principles:

### 8.1 Platform Before Integrations

We should not keep adding one-off support for new providers.

We should define core platform interfaces first, then implement providers against those interfaces.

### 8.2 Separate Source, Workflow, and Destination Concerns

A source should only be responsible for ingesting or fetching external content.

A workflow should be responsible for transforming normalized input into a canonical artifact.

A destination should be responsible for delivering a canonical artifact outward.

### 8.3 Canonical Internal Models

Nexus should use provider-neutral internal models for:

- incoming source events
- fetched source content
- produced artifacts
- delivery attempts
- workflow runs

Provider-specific metadata can still exist, but it should not define the core data model.

### 8.4 Multiple Workflow Types Must Be First-Class

Meeting summaries should not be hardcoded as the only meaningful output type.

The system should be able to represent multiple artifact types such as:

- meeting summary
- triage digest
- task brief
- follow-up brief

### 8.5 Orchestration Must Support Both Event-Driven and Scheduled Work

Some workflows are triggered by new source content.

Some workflows are triggered by time windows.

The platform must support both without inventing a separate architecture each time.

## 9. Proposed Foundation Architecture

Nexus should evolve toward five platform layers.

### 9.1 Source Layer

The Source Layer owns provider-specific ingestion and retrieval.

Responsibilities:

- authenticate source providers
- verify inbound webhooks or polling responses
- resolve the external event to a Nexus user and source account
- normalize inbound signals into a canonical source event
- fetch full content when needed

Examples:

- Google Drive transcript source
- Fireflies transcript source
- Slack notifications source
- Microsoft Teams notifications source

### 9.2 Canonical Normalization Layer

This layer converts source-specific payloads into Nexus-native records.

Examples of canonical records:

- `SourceConnection`
- `SourceEvent`
- `SourceItem`
- `WorkflowRun`
- `Artifact`
- `ArtifactDelivery`

This layer allows the rest of the application to operate without caring whether content came from Google Drive, Slack, Fireflies, or another provider.

### 9.3 Workflow Layer

The Workflow Layer turns normalized source data into product artifacts.

Examples:

- meeting-summary workflow
- quiet-mode triage workflow
- retry-delivery workflow
- scheduled digest compilation workflow

Each workflow should define:

- accepted input type
- triggering model
- processing steps
- output artifact type
- delivery behavior

### 9.4 Artifact Layer

The Artifact Layer stores the outputs generated by workflows.

Artifacts should be first-class records, not just JSON attached to a job.

Examples:

- meeting summary artifact
- notification digest artifact

Each artifact should include:

- artifact type
- owning user
- workflow association
- canonical structured payload
- human-readable title or label
- source references
- lifecycle status

### 9.5 Destination Layer

The Destination Layer delivers artifacts outward.

Responsibilities:

- authenticate destination providers
- validate destination configuration
- transform canonical artifacts into provider-specific payloads
- deliver the artifact
- report delivery status and external links

Examples:

- Nexus History
- Slack DM
- ClickUp Docs
- email digest
- Notion page

## 10. Proposed Core Domain Concepts

This PRD does not lock the final schema, but the following platform concepts should become first-class.

### 10.1 SourceConnection

Represents a user-authorized connection to an inbound provider.

Examples:

- a Google Drive source connection
- a Slack source connection
- a Fireflies source connection

Key requirements:

- provider identifier
- user mapping
- auth material or reference to stored auth material
- connection status
- provider account or workspace metadata

### 10.2 DestinationConnection

Represents a user-authorized connection to an outbound provider.

This may reuse parts of the existing connector configuration model, but it should be clearly modeled as a destination concern.

### 10.3 SourceEvent

Represents an inbound signal that something happened.

Examples:

- Google Drive file changed
- Slack mention received
- transcript available from Fireflies

Key requirements:

- provider
- external event ID or dedupe key
- related connection
- user mapping
- event type
- raw metadata
- received timestamp
- processing state

### 10.4 SourceItem

Represents the normalized unit of content the system may process.

Examples:

- a transcript file
- a transcript record from Fireflies
- a notification message
- a thread item

This is distinct from `SourceEvent`, which may merely indicate that a `SourceItem` is available or changed.

### 10.5 WorkflowRun

Represents execution of a workflow against one or more source items.

This generalizes the current `JobHistory` concept.

Key requirements:

- workflow type
- user
- status
- trigger type
- input references
- model used if AI is involved
- retry and failure tracking
- created and completed timestamps

### 10.6 Artifact

Represents a durable output generated by a workflow.

Examples:

- meeting summary
- quiet mode digest

### 10.7 ArtifactDelivery

Represents delivery of an artifact to a destination.

This generalizes the current delivery log model.

## 11. Architectural Rework Requirements

### 11.1 Split Inbound and Outbound Integration Contracts

Nexus should not force one connector interface to represent both source ingestion and destination delivery.

Recommended direction:

- `SourceProvider` or `InboundConnector` for inbound integrations
- `DestinationProvider` or `OutboundConnector` for outbound integrations

This avoids a misleading abstraction where inbound webhook parsing and outbound document delivery appear to be the same type of thing.

### 11.2 Introduce Artifact-Centric Delivery

Delivery should target a canonical artifact, not a meeting-summary-specific payload.

That means destination implementations should receive a canonical artifact contract plus any provider-specific rendering utilities.

### 11.3 Generalize Job Tracking Into Workflow Tracking

The current job model is transcript-oriented.

Nexus should evolve toward a `WorkflowRun` model that can support:

- transcript summarization
- scheduled notification digest processing
- retry operations
- future artifact generation workflows

### 11.4 Decouple Storage From A Single Workflow

Meeting summary output should no longer live only as JSON inside transcript job history.

Nexus should move toward separate artifact storage with structured payloads and explicit type metadata.

### 11.5 Unify Scheduling and Orchestration

Nexus needs a clearer orchestration model that supports:

- event-driven jobs from webhooks or polling
- scheduled jobs from recurring user preferences
- retries and dead-letter handling

This does not necessarily force one vendor, but it does require one platform model.

### 11.6 Standardize Identity Resolution

For inbound providers, the platform must be able to map an external event to the correct Nexus user and connection.

This is easy for some sources and more complex for others, so it should be treated as a first-class architectural concern.

## 12. Proposed Implementation Sequence

This sequence is designed to reduce rework and keep the product shipping.

### Phase 1: Platform Model Definition

- define source-side and destination-side contracts
- define canonical domain concepts and naming
- define artifact types and workflow types
- decide what existing models can evolve versus what should be replaced

### Phase 2: Storage and Tracking Refactor

- introduce new canonical records for source events, workflow runs, and artifacts
- migrate or bridge from the existing job history model
- align delivery tracking with artifact delivery rather than summary-specific logs

### Phase 3: Connector Model Cleanup

- separate inbound and outbound provider registries
- migrate Slack and ClickUp toward the clearer destination model
- preserve backward compatibility during transition

### Phase 4: Migrate Existing Meeting Summary Flow

- treat Google Drive as a source provider
- treat meeting summary generation as a workflow
- treat Nexus History, Slack, and ClickUp as destination providers

This is the proving ground for the new foundation.

### Phase 5: Build Quiet Mode On Top

- add Slack as an inbound source provider
- add notification events or source items
- add triage digest as a workflow and artifact type
- add scheduled digest orchestration

## 13. Success Criteria

The foundation rework is successful when the product can support these outcomes without core rearchitecture:

- a second meeting-summary source can be added without changing the core workflow engine
- a new destination can be added without changing the meeting-summary logic
- a new workflow type can be added without duplicating job, artifact, and delivery infrastructure
- Quiet Mode can be implemented as a workflow on the shared foundation rather than as a parallel system
- provider-specific logic is mostly isolated to provider modules rather than spread across the app

## 14. Risks

### 14.1 Over-Abstracting Too Early

There is a risk of building a framework that is more generic than the product needs.

Mitigation:

- only abstract around real near-term use cases already on the roadmap
- use meeting summaries and Quiet Mode as the two forcing functions

### 14.2 Migration Complexity

There is risk in refactoring the current meeting-summary pipeline while preserving working behavior.

Mitigation:

- keep the migration incremental
- preserve compatibility adapters where needed
- use the existing Google Drive flow as the first migration target

### 14.3 Provider Reality Mismatch

Different platforms will not fit a perfectly uniform abstraction.

Mitigation:

- keep canonical contracts small and strict
- allow provider metadata to remain provider-specific where necessary

### 14.4 Delivery and Source Concerns May Drift Again

If source and destination responsibilities are not clearly separated now, the same coupling problem will recur.

Mitigation:

- enforce separate contracts, registries, and terminology

## 15. Open Research Questions

The following should be answered before implementation begins:

1. What are the minimum canonical models needed to support both meeting summaries and Quiet Mode without premature abstraction?
2. Should `JobHistory` evolve into `WorkflowRun`, or should a new model be introduced and bridged from the old one?
3. Should the current `UserConnectorConfig` split into source connections and destination connections, or remain unified with explicit connection type metadata?
4. What scheduling model best supports user-specific digest times, retries, and event-driven processing?
5. What is the minimum artifact contract that both meeting summaries and notification digests can share?
6. What provider identity data must be stored to reliably map inbound events to users across Slack, Teams, Discord, Google Drive, and future sources?
7. How should Nexus History behave in a platform-agnostic world: as a destination, as an artifact store, or both?
8. Which parts of the current Slack implementation should remain legacy during migration, and which should be normalized first?

## 16. Recommendation

Yes, Nexus should rework the foundation before implementing Quiet Mode.

Not because the current architecture is wrong for the current product, but because the next set of planned features changes the shape of the product in a way the current structure does not cleanly represent.

The recommended next step is not a full rewrite. It is a deliberate platform refactor that introduces:

- explicit source-side architecture
- explicit destination-side architecture
- workflow-agnostic execution tracking
- artifact-first storage and delivery
- a clearer orchestration model

Once those pieces exist, Quiet Mode and future multi-source summary pipelines can be added with materially less rework and less product risk.