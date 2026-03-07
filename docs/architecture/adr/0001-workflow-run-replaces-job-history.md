# ADR 0001: WorkflowRun Replaces JobHistory

## Status

Accepted

## Context

The current `JobHistory` model is specific to the transcript-processing pipeline. It mixes execution tracking with product output persistence by storing the generated summary payload directly on the run record.

That coupling is acceptable for a single workflow, but it becomes a structural problem when Nexus needs to support:

- multiple source types
- multiple workflow types
- multiple artifact types
- non-summary workflows such as redelivery or scheduled compilation

## Decision

Nexus will replace `JobHistory` with `WorkflowRun` as the canonical execution record.

`WorkflowRun` will represent one execution of a workflow and will own:

- workflow identity
- trigger identity
- execution status
- input references
- model metadata
- timestamps
- retry and failure metadata

`WorkflowRun` will not be the long-term home of product output payloads. Durable outputs will be stored as first-class `Artifact` records linked to the run.

## Rationale

`WorkflowRun` is the better abstraction because it describes what the system is actually doing at the platform level: executing workflows, not merely processing transcript jobs.

This choice gives Nexus a stable execution model for:

- meeting summaries
- future digests
- future task briefs
- redelivery jobs
- future scheduled workflows

## Consequences

Positive:

- execution tracking becomes workflow-agnostic
- output payloads move to the correct domain model
- workflows can produce multiple artifacts or no artifact when appropriate
- future orchestration logic has a cleaner foundation

Negative:

- the current job-centric helpers and UI assumptions must be rewritten
- schema and query helpers will change materially

## Notes

Existing data does not need to be migrated. The implementation may replace the old model directly.