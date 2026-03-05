**NEXUS**

**UX Specification**

Attio CRM \+ ClickUp Connector Integration

March 2026  •  v1.0  •  Companion to Connector Technical Specification

| Document type | UX specification — interaction flows, UI states, copy, and layout guidance |
| :---- | :---- |
| **Audience** | Product designer, frontend engineer, QA |
| **Companion doc** | Nexus Connector Technical Specification (Attio \+ ClickUp) |
| **Design system** | Follows existing Nexus UI patterns: purple primary (\#6B46C1), status badges, card-based settings layout |

# **1\. UX Principles for Connectors**

These principles apply to all current and future output destination connectors. They ensure a consistent user experience regardless of how many integrations Nexus supports.

| Principle | What It Means |
| :---- | :---- |
| **Zero-effort after setup** | Connecting a destination is a one-time setup. After that, summaries flow automatically. The user should never need to choose a destination per meeting. |
| **Progressive disclosure** | Show connector options only when relevant. Don’t show Attio config until Attio is connected. Don’t show workflow toggles for disconnected services. |
| **Consistent patterns** | Every connector follows the same interaction shape: Connect → Configure → Enable. The UI cards, status badges, and toggle patterns are identical across destinations. |
| **Graceful degradation** | If one destination fails, others still deliver. The user sees a clear, specific error for the failed destination — never a generic failure for the whole summary. |
| **Additive model** | Destinations are independent toggles, not a single selection. Nexus History is always on. Everything else stacks on top. Users should feel they’re adding channels, not switching between them. |
| **No silent failures** | Every delivery attempt has a visible result. Success is quiet (a status badge). Failure is prominent (an alert with a clear recovery path). |

# **2\. Settings Page Redesign**

The Settings page is the control centre for all connectors. It needs three structural changes to support the additive destination model.

## **2.1 Connections Card**

The existing Connections card adds two new rows for Attio and ClickUp. Each follows the same visual pattern as the current Google Account and Push Channel rows.

**Layout per Connection Row**

| Element | Specification |
| :---- | :---- |
| **Left side** | Service icon \+ service name \+ account detail (e.g., workspace name or email). Stacked vertically, name bold, detail in smaller grey text. |
| **Right side** | Status badge: Connected (green) / Disconnected (red) / Expired (amber). Right-aligned on the same row. |
| **Below, when disconnected** | A primary action button: “Connect Attio” or “Connect ClickUp”. Purple filled button, matching existing “Connect / Reconnect” style. |
| **Below, when connected** | Two text links: “Configure” (opens config modal) and “Disconnect” (with confirmation). Separated by a • divider. |

**Connection Row Order**

Display connections in this fixed order, regardless of connection status: Google Account, Push Channel, Slack, Attio, ClickUp. This keeps the layout stable as users connect and disconnect services.

| Design Note: Don’t Hide Unconnected Services All available integrations should be visible at all times in the Connections card, even when disconnected. This serves as passive discovery — users learn what’s possible without navigating to a marketplace or integrations catalogue. Each disconnected row acts as a call-to-action. |
| :---- |

## **2.2 Output Destination Card — Redesign**

This is the most significant UX change. The current single-select dropdown is replaced with an additive toggle list.

**Current State (to be replaced)**

A dropdown with options: “Slack” or “Database”. Selecting one deselects the other. This creates the false impression that summaries go to only one place.

**New Design: Toggle List**

A vertical list of destination rows. Each row has a service name, a status indicator, and an on/off toggle.

| Destination | Prerequisite | Control | Description |
| :---- | :---- | :---- | :---- |
| **Nexus History** | Always on | No toggle (greyed out “On” state) | Every summary is saved here. |
| **Slack DM** | Requires Slack connected | Toggle on/off | Sends a DM when summary is ready. |
| **Attio CRM** | Requires Attio connected \+ configured | Toggle on/off | Creates a note on the selected record. |
| **ClickUp** | Requires ClickUp connected \+ configured | Toggle on/off | Creates a doc in the selected space. |

**Toggle States**

| State | Visual | Behaviour |
| :---- | :---- | :---- |
| **Enabled** | Purple filled toggle. Service name in default text colour. | Summaries are delivered to this destination on job completion. |
| **Disabled** | Grey outline toggle. Service name in default text colour. | Summaries are not sent to this destination. No data is lost — Nexus History always has the summary. |
| **Unavailable** | Toggle hidden or replaced with “Connect” link. Row text is grey. | Service is not connected or not configured. Clicking the row or link navigates to the Connections card. |
| **Always on** | Green filled non-interactive toggle. “Always on” label instead of toggle. | Nexus History. Cannot be disabled. Visually distinct from toggleable rows. |

**Copy for Card Header**

**Title:** Output Destinations

**Subtitle:** Choose where your meeting summaries are delivered. Nexus History is always on. Add as many destinations as you like.

## **2.3 Workflows Card — Extended**

The Workflows card currently has one toggle: “Auto-summarise.” It needs to be extended with per-destination delivery toggles. These are distinct from the Output Destination toggles — they control automation behaviour, not destination selection.

| Why Two Toggle Surfaces? Output Destinations answers “where do summaries go?” — it’s about routing. Workflows answers “what happens automatically?” — it’s about automation triggers. A user might want Slack as a destination but temporarily pause the auto-DM during a focus week. Keeping these separate gives precise control without forcing disconnection. |
| :---- |

**Workflow Toggles**

| Toggle | Description shown to user | Visibility rule |
| :---- | :---- | :---- |
| **Auto-summarise** | Process new transcripts automatically | Existing. Controls whether detected transcripts are queued for LLM processing. |
| **Slack DM on ready** | Notify via Slack when a summary is complete | New. Only visible when Slack is connected and enabled as a destination. |
| **Attio note on ready** | Create Attio note when a summary is complete | New. Only visible when Attio is connected, configured, and enabled. |
| **ClickUp doc on ready** | Create ClickUp doc when a summary is complete | New. Only visible when ClickUp is connected, configured, and enabled. |

# **3\. Connection Flows**

## **3.1 Attio Connection Flow**

The Attio flow has two phases: OAuth connection, then destination configuration (selecting a record). Both happen in sequence on first connect.

**Phase 1: OAuth Connect**

**1\.**  User clicks “Connect Attio” button in Settings \> Connections.

**2\.**  Button shows a loading spinner and text changes to “Connecting...”. Button is disabled.

**3\.**  Attio OAuth consent screen opens in a new browser tab (not a popup — popups are blocked by most browsers). The original Nexus tab shows a waiting state: “Complete the authorisation in the Attio tab, then return here.”

**4\.**  User approves access in Attio.

**5\.**  Attio redirects to Nexus callback URL. The callback page shows a brief success message (“Attio connected\! You can close this tab.”) and auto-closes after 3 seconds if possible.

**6\.**  The original Nexus Settings tab detects the successful connection (via polling or WebSocket) and updates the Attio row to “Connected” with a green badge. The configuration modal opens automatically.

**Phase 2: Record Configuration**

**1\.**  A modal appears with the title “Configure Attio — Select a default record.”

**2\.  Object type selector:** A dropdown or segmented control showing available Attio object types (e.g., People, Companies, Deals). Loaded from the Attio API. Default selection: Companies.

**3\.  Record search:** Below the object type selector, a searchable dropdown that loads records of the selected type. Typing filters results. Shows record name and any subtitle (e.g., domain for companies, email for people). Minimum 2 characters to trigger search.

**4\.**  User selects a record (e.g., “Acme Corp”).

**5\.**  A preview line confirms: “Meeting summaries will be added as notes on Acme Corp.”

**6\.**  User clicks “Save Configuration.” Modal closes. The Attio connection row now shows: “Attio CRM — Connected — Notes on Acme Corp.”

**7\.**  The Output Destination card now shows Attio as a toggleable row, enabled by default.

| Edge Case: User Closes OAuth Tab Without Completing If the user closes the Attio tab before completing authorisation, the original Nexus tab should time out after 2 minutes and return to the disconnected state with a message: “Attio connection was not completed. Click Connect Attio to try again.” No partial state should be saved. |
| :---- |

## **3.2 ClickUp Connection Flow**

The ClickUp flow follows the same two-phase pattern but with a different configuration step.

**Phase 1: OAuth Connect**

Identical interaction pattern to Attio. Button → loading → new tab → consent → callback → success. See Section 3.1 Phase 1 for details.

**Phase 2: Space/Folder Configuration**

**1\.**  A modal appears with the title “Configure ClickUp — Choose where to save meeting docs.”

**2\.  Workspace selector:** If the user belongs to multiple ClickUp workspaces, show a dropdown. If only one, auto-select it and show the name as a static label with a “Switch” link.

**3\.  Space selector:** A dropdown listing all spaces in the selected workspace. Each option shows the space name and icon/emoji if available.

**4\.  Folder selector (optional):** After selecting a space, an optional “Save in a specific folder?” expandable section. If expanded, shows a dropdown of folders within the selected space. If collapsed, docs are saved at the space root.

**5\.**  A preview line confirms: “Meeting docs will be created in Engineering \> Meeting Notes” or “Meeting docs will be created in Engineering (space root).”

**6\.**  User clicks “Save Configuration.” Modal closes. ClickUp row shows connected state with the space/folder path.

**7\.**  Output Destination card shows ClickUp as a toggleable row, enabled by default.

| Design Note: Hierarchy Breadcrumb When displaying the ClickUp configuration, use a breadcrumb format: “Workspace \> Space \> Folder.” This maps directly to ClickUp’s mental model and makes it immediately clear where docs will land. If no folder is selected, end the breadcrumb at the space. |
| :---- |

# **4\. Reconfiguration and Disconnection**

## **4.1 Changing Configuration**

Users may need to change their Attio record or ClickUp space after initial setup. This should be low-friction.

**Trigger**

• A “Configure” text link on the connected row in Settings \> Connections.

• The same modal used for initial configuration opens, pre-populated with the current selection.

• User changes their selection and clicks “Save Configuration.”

• **Important:** Changing configuration does not affect past summaries. Only future deliveries use the new config. A confirmation message states this: “Updated. Future meeting summaries will be saved to \[new destination\].”

## **4.2 Disconnecting a Service**

**Flow**

**1\.**  User clicks “Disconnect” on a connected service row.

**2\.**  A confirmation dialog appears: 

| Title | Disconnect Attio? |
| :---- | :---- |
| **Body** | Meeting summaries will no longer be sent to Attio. Your existing notes in Attio will not be affected. You can reconnect at any time. |
| **Actions** | Cancel (secondary) • Disconnect (destructive red) |

**3\.**  On confirm: OAuth tokens are revoked and deleted. Config is cleared. Status badge updates to “Disconnected.” Output Destination toggle for this service is removed. Workflow toggle is removed.

**4\.**  The row returns to its disconnected state with a “Connect” button.

## **4.3 Expired or Revoked Tokens**

If a token expires (Attio) or is revoked externally (ClickUp), the connector’s healthCheck detects this.

**What the User Sees**

• The connection row in Settings shows an amber “Expired” badge instead of green “Connected.”

• The Dashboard’s Connections panel (right side) shows the amber status.

• A non-blocking banner appears at the top of the Dashboard: “Your Attio connection has expired. Reconnect to continue receiving meeting notes in Attio.” with a “Reconnect” button.

• Deliveries to the expired connector are paused. Other destinations continue normally.

• The delivery\_log records a “failed” entry with reason “token\_expired” for any summaries generated while the connection is expired.

• Once reconnected, the user can retry failed deliveries from the History page.

# **5\. Dashboard Changes**

## **5.1 Connections Panel (Right Side)**

The existing right-side panel shows Google Account and Push Channel status. Extend it to show all connected services.

**Layout**

• Each service is a single row: icon, name, and status badge.

• Only show services that are connected or have a problem. Don’t list disconnected services here — the Dashboard panel should be minimal and unobtrusive (per the PRD).

• If all connections are healthy, the panel header says “Connections” with a “Manage →” link to Settings.

• If any connection has a problem (Disconnected, Expired), the panel header shows a warning indicator and the problem row is highlighted amber.

**Service Order in Panel**

Problem connections float to the top. Healthy connections below. Within each group, maintain the fixed order: Google, Push Channel, Slack, Attio, ClickUp.

## **5.2 Meeting Feed — Delivery Indicators**

Each meeting row in the Dashboard feed currently shows a single status badge (Ready, Processing, etc.). Extend this to show which destinations received the summary.

**When Status Is “Ready”**

• Below the meeting title and date line, show a row of small destination icons (or text labels) indicating successful deliveries: e.g., “Slack • Attio • ClickUp.”

• If a delivery to one destination failed: show the destination name in red with a subtle warning icon. Clicking it shows a tooltip with the error and a “Retry” link.

• This row is compact and secondary to the meeting title. Do not add visual weight — users should scan past it unless something is wrong.

**Visual Hierarchy**

Meeting title (primary) \> Date and status badge (secondary) \> Delivery indicators (tertiary). The delivery indicators are the smallest text on the row and use grey for successful deliveries, red only for failures.

## **5.3 Summary Modal — Delivery Section**

The summary modal (shown when clicking a meeting) should include a small delivery status section below the follow-ups.

**Layout**

| Element | Specification |
| :---- | :---- |
| **Section title** | Delivered to |
| **Content** | A list of destinations with status per destination. Each row shows: destination icon, name, status (Delivered / Failed / Pending), and timestamp. |
| **Failed row** | Shows the error reason in small red text below the destination name. A “Retry” button appears inline on the right. |
| **Position** | Below Follow-Ups, above a subtle divider. This section is collapsed by default and expandable via a “Show delivery details” link to avoid cluttering the summary view. |

# **6\. History Page Changes**

## **6.1 Destination Column — Multi-Value**

The History page currently shows a single “DESTINATION” column with values like “SLACK” or “DATABASE.” This changes to support multiple values.

**New Behaviour**

• Column header remains “DESTINATION” (or rename to “DELIVERED TO” for clarity).

• Each cell shows a comma-separated list or pill badges for each destination: e.g., “Nexus • Slack • Attio.”

• Failed deliveries show the destination name with a red indicator: “Nexus • Slack • Attio (failed).”

• **Filter addition:** Add a “Destination” filter dropdown alongside the existing status filters. Options: All, Nexus, Slack, Attio, ClickUp. Selecting a destination shows only summaries that were delivered (or attempted) to that destination.

## **6.2 Retry from History**

When a delivery has failed for one destination, the History page row should provide a quick retry path.

• Hovering or clicking the failed destination pill reveals a “Retry” action.

• Retry re-invokes the connector’s deliver() method with the existing summary payload.

• During retry, the pill shows a spinning indicator.

• On success, the pill updates to the normal delivered state.

• On repeated failure, the pill remains red with an updated error timestamp. The user is prompted to check their connection in Settings.

# **7\. Onboarding and Discovery**

## **7.1 Dashboard Nudge for New Connectors**

When a user has Slack connected but no CRM or project management tool, the Dashboard should subtly promote the new integrations.

**Nudge Card**

• Appears in the right panel below the Workflows section (same position as the existing “How it works” card).

• **Title:** “New: Send summaries to Attio and ClickUp”

• **Body:** “Automatically log meeting notes in your CRM or create docs in your project workspace. Connect in Settings.”

• **Action:** “Set up →” link to Settings \> Connections.

• Dismissible. Once dismissed, do not show again for this user. Store dismissal state in user preferences.

• Only show when: user has at least 3 processed meetings (they’ve experienced the core value) AND neither Attio nor ClickUp is connected.

## **7.2 First Summary After Connecting**

The first time a summary is delivered to a newly connected destination, add a one-time highlight in the Dashboard feed.

• The meeting row in the feed shows a subtle badge: “First summary sent to Attio\!” or “First doc created in ClickUp\!”

• The badge uses a light purple background (celebration, not alarm).

• This appears once per destination, per user. Never again after the first successful delivery.

## **7.3 Empty State Updates**

If the user has connected Attio or ClickUp but no summaries have been delivered yet (e.g., auto-summarise is off), the History page empty state should mention the new destinations.

| Empty State Copy Your meeting summaries will appear here once processed. They’ll be delivered to your connected destinations: Nexus History, Slack, and Attio. Have a Google Meet with transcription enabled to get started. |
| :---- |

# **8\. Error States and Recovery**

Error communication is critical for an automation product. Users need to trust that Nexus is working, and when something goes wrong, they need to know exactly what happened and what to do.

## **8.1 Error Taxonomy**

| Error Type | Cause | Visual Treatment | Recovery Path |
| :---- | :---- | :---- | :---- |
| **Connection lost** | OAuth token expired or revoked externally | Amber “Expired” badge on connection row. Banner on Dashboard. | Reconnect button (one-click re-auth) |
| **Config invalid** | Selected Attio record or ClickUp space was deleted | Red “Config Error” badge. Error detail on hover. | Reconfigure button opens config modal |
| **Delivery failed (transient)** | API timeout, rate limit, server error | Red destination pill in History with retry. Auto-retry in background. | Automatic (up to 3 attempts). Manual retry available. |
| **Delivery failed (permanent)** | Insufficient permissions, invalid payload | Red destination pill with error detail. No auto-retry. | Error message explains the issue. Link to Settings. |
| **Partial delivery** | Summary delivered to Slack but failed for Attio | Meeting row shows mixed state: green for Slack, red for Attio. | Retry only the failed destination. Others unaffected. |

## **8.2 Error Copy Guidelines**

Error messages should follow these rules:

• **Be specific:** “Attio returned a permission error. Check that your Attio account has access to the selected record.” Not: “Something went wrong.”

• **Include the destination:** “Failed to create note in Attio.” Not: “Delivery failed.”

• **Offer a next step:** Every error message ends with an actionable link: “Retry”, “Reconnect”, or “Update Settings.”

• **Don’t blame the user:** “Your ClickUp connection needs to be refreshed.” Not: “You need to reconnect ClickUp.”

• **Don’t expose technical details:** No HTTP status codes, no stack traces. Use human language. Log the technical details internally.

# **9\. Notification Patterns**

The Dashboard has a “Notifications” bell icon in the header. Extend this to surface connector-related events.

## **9.1 Notification Events**

| Event | Notification Copy | Indicator |
| :---- | :---- | :---- |
| **Connection expired** | “Your Attio connection has expired. Reconnect to continue receiving meeting notes.” | Amber dot on bell icon. Persists until resolved. |
| **Delivery failed** | “Meeting summary for ‘Product Sync’ could not be delivered to ClickUp. Retry or check your connection.” | Red dot on bell icon. Cleared on retry or dismiss. |
| **First successful delivery** | “Your first meeting summary was sent to Attio\! Check your CRM.” | Purple dot (celebration). Auto-clears after viewed. |
| **Config invalidated** | “The ClickUp space ‘Engineering’ was deleted. Update your configuration to continue.” | Amber dot. Persists until config updated. |

# **10\. Interaction Summary**

Quick reference for every screen that is affected by the connector additions.

| Screen | Change | Key Interaction |
| :---- | :---- | :---- |
| **Settings: Connections** | Add Attio and ClickUp rows following existing pattern | Connect, Configure, Reconnect, Disconnect actions per service |
| **Settings: Output Destinations** | Replace dropdown with additive toggle list | Nexus always on. Slack, Attio, ClickUp independently toggleable |
| **Settings: Workflows** | Add per-destination delivery toggles | Only visible for connected \+ enabled destinations |
| **Dashboard: Connections panel** | Show Attio and ClickUp status when connected | Problem connections float to top with amber/red badges |
| **Dashboard: Meeting feed** | Add delivery indicator row below meeting title | Small destination labels. Red for failed. Retry on click. |
| **Dashboard: Summary modal** | Add collapsible “Delivered to” section | Per-destination status with retry for failed deliveries |
| **Dashboard: Nudge card** | Promote new connectors to eligible users | Dismissible. Only shown after 3+ meetings, no CRM/PM connected |
| **History: Destination column** | Show multiple destinations per row | Pill badges. Add destination filter dropdown. |
| **History: Retry** | Allow retry of failed deliveries inline | Per-destination retry from the destination pill |
| **Notifications** | Surface connection and delivery events | Colour-coded dot indicators on the bell icon |

| Next Steps This spec covers the interaction design and UI states. The companion Connector Technical Specification covers the backend architecture, API contracts, data models, and implementation plan. Both documents should be reviewed together to ensure alignment between frontend and backend work. |
| :---- |

