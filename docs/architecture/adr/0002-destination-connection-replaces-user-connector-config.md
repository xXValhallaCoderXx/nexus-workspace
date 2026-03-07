# ADR 0002: DestinationConnection Replaces UserConnectorConfig

## Status

Accepted

## Context

The current `UserConnectorConfig` model serves as a destination connection store, but the name and surrounding abstractions are too vague for the platform direction. Nexus is moving toward distinct source-side and destination-side provider contracts.

The existing model also sits awkwardly beside legacy destination handling, which makes the outbound architecture harder to reason about.

## Decision

Nexus will replace `UserConnectorConfig` with `DestinationConnection` as the canonical outbound connection model.

`DestinationConnection` will represent user-configured delivery targets and will own:

- destination provider identity
- enabled state
- connection status
- provider configuration
- encrypted tokens when applicable
- external account or workspace metadata

System destinations such as Nexus History will participate in the destination model without requiring OAuth semantics.

## Rationale

`DestinationConnection` is the better abstraction because it names the real product concept directly: an outbound delivery connection.

This makes the platform easier to extend and easier to explain:

- source connections are for inbound systems
- destination connections are for outbound systems

That separation is especially important before adding future inbound chat providers.

## Consequences

Positive:

- outbound architecture becomes explicit and easier to extend
- Slack and ClickUp can live under the same destination model
- system destinations can be represented cleanly
- source and destination concerns stop sharing one ambiguous concept

Negative:

- current connector naming and helper boundaries will need cleanup
- Slack delivery will need to be normalized under the new outbound contract

## Notes

Existing data does not need to be migrated. The implementation may replace the old model directly.