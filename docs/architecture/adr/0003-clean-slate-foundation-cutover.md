# ADR 0003: Clean-Slate Foundation Cutover

## Status

Accepted

## Context

The earlier technical design allowed for compatibility layers, bridging, and gradual migration between legacy and new models. That approach reduces short-term operational risk, but it also increases the chance that temporary architecture survives longer than intended.

For Nexus, existing data is not important and may be wiped during the refactor.

## Decision

Nexus will implement the foundation refactor as a clean-slate cutover.

This means:

- new canonical tables may replace old tables directly
- compatibility layers should be kept to a minimum
- existing non-critical persisted data may be reset
- legacy helper paths should be deleted once equivalent new behavior exists

## Rationale

The foundation refactor is intended to produce a cleaner long-term platform model. Since data preservation is not a requirement, the codebase should optimize for architectural clarity instead of migration safety.

This reduces the risk of carrying forward:

- duplicate models
- adapter-heavy business logic
- stale route and repository helpers
- ambiguous ownership between old and new systems

## Consequences

Positive:

- implementation can target the desired architecture directly
- schema design is simpler
- the codebase reaches the intended steady state faster
- future product work starts from cleaner primitives

Negative:

- old data and old assumptions are discarded
- some user-visible settings and test fixtures may need to be recreated during development

## Notes

This ADR applies to the foundation rework only. It does not imply that all future feature work should prefer destructive cutovers.