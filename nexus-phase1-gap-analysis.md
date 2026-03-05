**NEXUS**

**Phase 1 Gap Analysis & Compliance Audit**

March 2026  •  Generated from PRD v1.0 review against current implementation

# **1\. Purpose**

This document identifies gaps between the Nexus Phase 1 PRD (v1.0) and the current implementation as observed from the application UI on March 6, 2026\. Each gap includes the PRD reference, current state, expected state, impact assessment, and acceptance criteria.

This document is intended to be used by an engineering agent to audit the codebase and confirm which gaps are genuine, which are already addressed in code but not visible in the screenshots reviewed, and which require implementation work.

# **2\. How to Use This Document**

For each gap listed below, the auditing agent should:

**1\.** Search the codebase for relevant implementation code matching the gap description.

**2\.** Classify the gap as: CONFIRMED (not implemented), PARTIAL (partially implemented), RESOLVED (already implemented but not visible in screenshots), or DEFERRED (consciously deprioritised with documented reasoning).

**3\.** For CONFIRMED and PARTIAL gaps, produce a technical implementation brief covering: files to modify, estimated effort, dependencies, and suggested sprint allocation.

**4\.** For items marked as product decisions (GAP-007, GAP-008), flag for product owner review rather than engineering implementation.

# **3\. Gap Summary**

| ID | Gap | Priority | Area | PRD Reference |
| :---- | :---- | :---- | :---- | :---- |
| GAP-001 | Meeting Title Cleanup | **HIGH** | Display | Section 2.4, 2.6, 2.7 |
| GAP-002 | Output Destination Model — Additive, Not Exclusive | **HIGH** | Architecture | Section 2.5 |
| GAP-003 | Independent Slack DM Toggle | **HIGH** | Settings | Section 2.5, 2.8 |
| GAP-004 | Failed Job Retry Mechanism | **HIGH** | Reliability | Section 2.3, 6 (Non-Functional) |
| GAP-005 | Push Channel Auto-Renewal and Reconnection | **HIGH** | Reliability | Section 2.1, 6 (Non-Functional) |
| GAP-006 | Designed Empty States | **MEDIUM** | UX | Section 2.4, 2.6, 2.7 |
| GAP-007 | Dashboard Inline Summary Expansion | **MEDIUM** | Display | Section 2.4 |
| GAP-008 | Dashboard KPI Strip — Average Duration Missing | **LOW** | Display | Section 2.4 |
| GAP-009 | Meeting Source and Tags in Feed | **LOW** | Data | Section 2.4, 2.6 |
| GAP-010 | Connector Interface Abstraction for Output Destinations | **MEDIUM** | Architecture | Section 2.5, Phase 2 Roadmap |

**5 HIGH**  •  **3 MEDIUM**  •  **2 LOW**

# **4\. Detailed Gap Analysis**

**GAP-001  Meeting Title Cleanup**

Priority: **HIGH**    Area: Display / UX    PRD: Section 2.4, 2.6, 2.7

**Description**

The PRD requires clean display names for meetings throughout the Dashboard, History, and Transcripts pages. Currently, raw Google Meet filenames are displayed including timestamps, timezone offsets, and the "Notes by Gemini" suffix.

| Current State Titles display as raw filenames: "Gnosis Biz \- demand signals sync – 2026/03/04 10:57 GMT+08:00 – Notes by Gemini" | Expected State Titles are parsed and cleaned to display as: "Gnosis Biz \- Demand Signals Sync" with date and time shown in separate metadata fields. |
| :---- | :---- |

**Impact Assessment**

Affects every screen. Raw filenames make the product feel like a file browser rather than an intelligent assistant. First impression suffers for every user.

**Acceptance Criteria**

Meeting titles across Dashboard, History, Notes, and summary modals display cleaned names. Timestamps, timezone info, and "Notes by Gemini" suffixes are stripped. Date and time are displayed in dedicated UI fields using the user’s local format.

**GAP-002  Output Destination Model — Additive, Not Exclusive**

Priority: **HIGH**    Area: Architecture / UX    PRD: Section 2.5

**Description**

The PRD specifies that Nexus History is always on as the default destination, with Slack (and future destinations) as additional, independently togglable outputs. The current implementation appears to treat output destination as a single-select dropdown, meaning a summary goes to Slack OR the database, not both.

| Current State Settings shows a single dropdown to select output destination (Slack or Database). History page shows "SLACK" or "DATABASE" as mutually exclusive destinations per summary. | Expected State Every summary is always saved to Nexus History (non-negotiable). Slack, and future destinations like Notion or Google Drive, are additive toggles that can be independently enabled or disabled. A single summary can be delivered to multiple destinations simultaneously. |
| :---- | :---- |

**Impact Assessment**

This is architecturally significant. A single-select model will require a rewrite when adding Notion, Google Drive, email, or CRM destinations in Phase 2\. It also creates user confusion — toggling to Slack should not mean losing the in-app history. This is the foundation for the modular connector/plugin architecture discussed for future integrations.

**Acceptance Criteria**

Summaries are always persisted in Nexus History regardless of other settings. Slack delivery is a separate toggle (on/off) independent of other destinations. The History page shows all destinations a summary was delivered to, not just one. The data model supports multiple destinations per summary (e.g., a junction table or array field).

**GAP-003  Independent Slack DM Toggle**

Priority: **HIGH**    Area: Settings / Workflows    PRD: Section 2.5, 2.8

**Description**

The PRD distinguishes between Slack being connected as a service and Slack DM delivery being enabled as a workflow. A user should be able to connect Slack but temporarily pause DM delivery without disconnecting the integration entirely.

| Current State The Workflows section in Settings only shows an "Auto-summarise" toggle. There is no independent toggle for Slack DM delivery. | Expected State Workflows section includes two toggles: (1) Auto-summarise — process new transcripts automatically, and (2) Slack DM on ready — send summary to Slack when processing completes. The Slack DM toggle is only visible/active when Slack is connected. |
| :---- | :---- |

**Impact Assessment**

Without this, users who want to pause notifications must disconnect Slack entirely and re-authenticate later. This creates friction and undermines trust in the connection system.

**Acceptance Criteria**

Settings \> Workflows displays a "Slack DM on ready" toggle when Slack is connected. Toggle can be turned off without disconnecting Slack. When off, summaries are still saved to Nexus History but not sent via Slack DM. Toggle state is respected by the delivery pipeline.

**GAP-004  Failed Job Retry Mechanism**

Priority: **HIGH**    Area: Reliability / UX    PRD: Section 2.3, 6 (Non-Functional)

**Description**

The PRD is explicit that failed jobs must be surfaced to the user with a retry option and that silent failures are not acceptable. The Notes page shows a "Failed" filter tab, but it is unclear whether failed items have a visible retry action.

| Current State Failed filter exists on Notes and History pages. Unknown whether a retry button is present on failed items. | Expected State Any meeting with status "Failed" displays a prominent "Retry" button. The failure reason is shown to the user (e.g., LLM timeout, API key invalid, transcript too long). Retry re-queues the job through the standard processing pipeline. |
| :---- | :---- |

**Impact Assessment**

Without retry, a failed meeting summary requires the user to manually re-trigger from the Transcripts page (if they even realise it failed). This is the number one trust killer for an automation product — if it fails silently, users stop relying on it.

**Acceptance Criteria**

Failed items on Dashboard, Notes, and History show a "Retry" button. Clicking retry re-processes the transcript and updates status to "Processing". A brief failure reason is displayed (e.g., "LLM request timed out", "Transcript too large"). Internal alerts fire on critical path failures (LLM errors, Slack delivery failures).

**GAP-005  Push Channel Auto-Renewal and Reconnection**

Priority: **HIGH**    Area: Reliability / Infrastructure    PRD: Section 2.1, 6 (Non-Functional)

**Description**

The PRD requires that Google Drive push channel expiry is handled automatically, with re-authorisation prompts sent before the channel lapses. The push channel should be monitored and renewed proactively, not reactively.

| Current State Dashboard shows Push Channel as "Inactive" and Google Account as "Disconnected". Settings shows a "Connect / Reconnect" button. It is unclear whether push channel renewal is automated or relies entirely on user action. | Expected State Push channel is renewed automatically before expiry without user intervention. If auto-renewal fails (e.g., token revoked), the user receives a clear in-app alert and optional email/Slack notification with a one-click reconnect path. The system does not silently stop watching for transcripts. |
| :---- | :---- |

**Impact Assessment**

The entire product value proposition depends on automatic detection. If the push channel silently expires and the user doesn’t notice, they lose summaries without knowing it. This is the single most critical reliability concern for Phase 1\.

**Acceptance Criteria**

Push channel is renewed automatically at least 24 hours before expiry. If renewal fails, user sees an alert on the Dashboard and receives a notification via their configured channel. Connection status updates in real time across Dashboard and Settings. Reconnection is a single click from any alert surface. System logs all push channel lifecycle events for observability.

**GAP-006  Designed Empty States**

Priority: **MEDIUM**    Area: UX / Onboarding    PRD: Section 2.4, 2.6, 2.7

**Description**

The PRD specifies that empty states should be designed for new users across the Dashboard, History, and Transcripts pages. A first-time user with no meetings should see clear guidance on what Nexus does and what to do next.

| Current State Unable to confirm from screenshots whether empty states are implemented. The Dashboard has a "How it works" card on the right panel, which is a good start, but it’s unclear what a zero-meeting state looks like. | Expected State Dashboard empty state: explains the product, shows connection status prominently, and tells the user what will happen after their next meeting. History empty state: explains that completed summaries will appear here, with a link to process existing transcripts. Notes empty state: prompts the user to connect Google Account if not connected, or explains that transcripts will appear after their next meeting. |
| :---- | :---- |

**Impact Assessment**

First impressions define retention. A blank page with no guidance causes confusion and abandonment, especially for a product that requires waiting for the next meeting before value is delivered.

**Acceptance Criteria**

Each main page (Dashboard, History, Notes) has a distinct empty state design. Empty states include contextual guidance appropriate to the page. Connection CTAs are prominent when Google Account is not connected. Empty states are visually consistent with the product’s design language.

**GAP-007  Dashboard Inline Summary Expansion**

Priority: **MEDIUM**    Area: Display / UX    PRD: Section 2.4

**Description**

The PRD states that expanding a row on the Dashboard reveals the AI summary inline, with no separate page navigation required. The current implementation opens a modal overlay.

| Current State Clicking a meeting on the Dashboard opens a centered modal/dialog with the summary content. | Expected State The PRD specifies inline expansion (accordion-style). However, the current modal approach may actually be a better UX for information density. This item needs a product decision. |
| :---- | :---- |

**Impact Assessment**

Low — the modal approach works well and may be preferable. This is a deliberate deviation worth documenting rather than a gap to fix.

**Acceptance Criteria**

Product owner confirms whether modal or inline expansion is the intended pattern. If modal is approved, PRD is updated to reflect the decision. If inline is preferred, Dashboard rows expand in-place to show summary content.

**GAP-008  Dashboard KPI Strip — Average Duration Missing**

Priority: **LOW**    Area: Display / UX    PRD: Section 2.4

**Description**

The PRD specifies three KPIs: meetings this week, summaries ready, and average duration. The current Dashboard shows meetings this week, summaries ready, and currently processing.

| Current State Third KPI shows "Currently processing" count. | Expected State Third KPI shows average meeting duration for the week. |
| :---- | :---- |

**Impact Assessment**

Minor. The "currently processing" metric may actually be more useful operationally than average duration. This is a product decision, not a bug.

**Acceptance Criteria**

Product owner decides which three KPIs to display. If average duration is desired, it is calculated from transcript metadata and shown in the KPI strip. PRD is updated to reflect whichever set is chosen.

**GAP-009  Meeting Source and Tags in Feed**

Priority: **LOW**    Area: Data / Display    PRD: Section 2.4, 2.6

**Description**

The PRD specifies that each meeting row shows source (Meet or Drive) and tags. The current Dashboard and History pages do not appear to show tags, and source attribution is only visible in the History page as "SLACK" or "DATABASE" (which indicates delivery destination, not source).

| Current State No visible tags on meeting rows. Source shown on History page refers to delivery destination rather than input source. | Expected State Each meeting row shows its input source (Google Meet auto-detected vs. Drive manual trigger). Tags field is available for user-applied or auto-generated categorisation. |
| :---- | :---- |

**Impact Assessment**

Low for Phase 1 with a single source type. Becomes important in Phase 2 when multiple input sources exist. Tags become valuable when users have enough meeting volume to need categorisation.

**Acceptance Criteria**

Meeting rows display source indicator (Meet / Drive). Tags field exists in the data model even if not actively populated in Phase 1\. History page "Destination" column correctly reflects delivery destination(s), not input source.

**GAP-010  Connector Interface Abstraction for Output Destinations**

Priority: **MEDIUM**    Area: Architecture / Future-Proofing    PRD: Section 2.5, Phase 2 Roadmap

**Description**

While not explicitly required by the Phase 1 PRD, the architectural seam for a modular connector/plugin system should be established now. Phase 2 adds Notion and Google Drive as destinations. If Slack delivery is hard-wired into the summarisation pipeline, every new destination will require modifying core logic.

| Current State Unknown — requires codebase inspection. Delivery to Slack may be directly coupled to the summarisation job completion handler. | Expected State A clean interface exists between the summarisation pipeline (which produces a standardised summary payload) and the delivery layer (which routes the payload to configured destinations). Adding a new destination should require writing a new connector module and registering it, without modifying the summarisation or job queue code. |
| :---- | :---- |

**Impact Assessment**

This is a two-way door — it can be refactored later, but doing it now while there are only two destinations (Nexus History \+ Slack) is dramatically cheaper than refactoring with four or five destinations. Directly supports the integration scalability concern raised about CRM and other third-party destinations.

**Acceptance Criteria**

Summary payload is defined as a structured schema independent of any destination. Delivery to each destination goes through a common interface. Adding a new destination does not require changes to the summarisation pipeline or job queue. Routing configuration is stored per-user and supports multiple simultaneous destinations.

# **5\. Audit Response Template**

The auditing agent should produce a response document using the following structure for each gap item:

| Field | Content |
| :---- | :---- |
| **Gap ID** | e.g. GAP-001 |
| **Status** | CONFIRMED / PARTIAL / RESOLVED / DEFERRED |
| **Evidence** | File paths, function names, or code references supporting the classification |
| **If CONFIRMED** | Implementation brief: files to create/modify, estimated effort (hours), dependencies on other gaps, suggested sprint |
| **If PARTIAL** | What exists, what is missing, effort to complete |
| **If RESOLVED** | Evidence that it is implemented (code reference) and why it was not visible in screenshots |
| **If DEFERRED** | Documented reasoning for deferral and any prerequisite for revisiting |

# **6\. Notes for Auditing Agent**

**1\.** This analysis is based on five UI screenshots of the running application. Some features may be implemented in code but not visible in the specific states captured. Always verify against the codebase before classifying a gap as CONFIRMED.

**2\.** GAP-007 and GAP-008 are flagged as product decisions, not engineering gaps. These should be escalated to the product owner rather than implemented directly.

**3\.** GAP-002 (Output Destination Model) and GAP-010 (Connector Interface) are related. GAP-002 is the user-facing manifestation; GAP-010 is the architectural abstraction. Solving GAP-010 properly will resolve GAP-002 as a side effect.

**4\.** GAP-005 (Push Channel Renewal) is the highest-risk item from a product reliability perspective. If the push channel silently expires, the core product value proposition breaks. Prioritise investigation of this gap first.

**5\.** The Model Context editor visible in Settings (customisable system prompt for LLM summarisation) is a feature that goes beyond the PRD specification. This is a positive deviation and should be documented as such.