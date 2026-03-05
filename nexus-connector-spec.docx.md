**NEXUS**

**Connector Technical Specification**

Attio CRM \+ ClickUp — Phase 2 Output Destinations

March 2026  •  v1.0

| Status | Draft — Ready for engineering review |
| :---- | :---- |
| **Depends on** | GAP-002 (Additive Destination Model), GAP-010 (Connector Interface) |
| **Auth pattern** | OAuth 2.0 Authorization Code Grant for both integrations |
| **Attio scope** | Ship Option A (user picks default record), design interface for Option C (auto-match attendees) |
| **ClickUp scope** | Create a Doc in a user-selected workspace/space with the formatted meeting summary |

# **1\. Connector Architecture**

Both connectors must conform to the shared Connector Interface established in Phase 1 (per GAP-010). This section defines the interface contract and the summary payload schema that all connectors consume.

## **1.1 Connector Interface Contract**

Every output destination implements the following interface. This is the single integration point between the summarisation pipeline and any delivery target.

interface Connector {

  // Unique identifier: 'attio', 'clickup', 'slack', etc.

  id: string;

  // Human-readable name for the Settings UI

  displayName: string;

  // OAuth / auth setup

  authenticate(userId: string): Promise\<AuthResult\>;

  disconnect(userId: string): Promise\<void\>;

  healthCheck(userId: string): Promise\<ConnectionStatus\>;

  // Destination-specific config (e.g., which record, which space)

  getConfigSchema(): ConnectorConfigSchema;

  validateConfig(config: Record\<string, any\>): Promise\<boolean\>;

  // Core delivery

  deliver(payload: MeetingSummaryPayload, config: UserConnectorConfig): Promise\<DeliveryResult\>;

}

| Design Principle: Connectors Own the Transformation The summarisation pipeline produces a single standardised payload. Each connector is responsible for transforming that payload into the destination’s native format. The pipeline never formats content for a specific destination. This means adding a new destination requires zero changes to the summarisation or job queue code. |
| :---- |

## **1.2 Meeting Summary Payload Schema**

This is the canonical data structure produced by the summarisation pipeline. All connectors receive this payload and extract what they need.

interface MeetingSummaryPayload {

  // Identity

  summaryId: string;

  meetingTitle: string;           // Cleaned title (no timestamps, no 'Notes by Gemini')

  meetingDate: string;            // ISO 8601

  meetingDuration?: number;       // Minutes, if available from transcript metadata

  sourceType: 'google\_meet' | 'drive\_manual';

  sourceFileId: string;           // Google Drive file ID

  // Participants

  attendees: Array\<{

    name: string;

    email?: string;               // Critical for future attendee matching (Option C)

  }\>;

  // Summary content

  summary: string;                // 2-3 paragraph executive summary

  topics: string\[\];               // Key topics discussed

  decisions: string\[\];            // Decisions made

  actionItems: Array\<{

    owner: string;                // Person name

    ownerEmail?: string;          // For future assignee matching

    task: string;

    deadline?: string;

  }\>;

  followUps: string\[\];            // Follow-up items

  // Metadata

  processedAt: string;            // ISO 8601

  modelUsed: string;              // e.g., 'anthropic/claude-sonnet-4-5-20250929'

  nexusUrl: string;               // Deep link to summary in Nexus

}

| Forward Compatibility: Option C Attendee Matching The payload includes optional email fields on attendees and action item owners. These are not required for Option A delivery but MUST be populated by the summarisation pipeline now. When Option C is implemented, the Attio connector will use attendee emails to search Attio contacts via the Records API and automatically select the matching parent record. The interface should accept a RecordMatchingStrategy that defaults to ManualSelection (Option A) and can be swapped to AttendeeEmailMatch (Option C) without changing the connector’s deliver() method signature. |
| :---- |

## **1.3 Delivery Routing**

When a summary job completes, the delivery router queries the user’s active destinations and fans out delivery to each enabled connector in parallel.

// Routing table (database)

user\_connector\_config {

  id:            uuid PRIMARY KEY

  user\_id:       uuid REFERENCES users(id)

  connector\_id:  string       // 'nexus\_history' | 'slack' | 'attio' | 'clickup'

  enabled:       boolean

  config\_json:   jsonb        // Destination-specific config

  oauth\_tokens:  jsonb        // Encrypted. access\_token, refresh\_token, expires\_at

  created\_at:    timestamptz

  updated\_at:    timestamptz

}

// Delivery log (append-only)

delivery\_log {

  id:            uuid PRIMARY KEY

  summary\_id:    uuid REFERENCES summaries(id)

  connector\_id:  string

  status:        'pending' | 'delivered' | 'failed'

  error\_message: text

  delivered\_at:  timestamptz

  retry\_count:   int DEFAULT 0

}

The delivery\_log table replaces the single "destination" column currently shown in the History page. A summary can have multiple delivery\_log entries — one per destination. The History UI should render all destinations a summary was delivered to, supporting the additive model from GAP-002.

# **2\. Attio Connector**

## **2.1 Overview**

| Property | Detail |
| :---- | :---- |
| **Connector ID** | attio |
| **Action** | Create a Note on a user-selected record |
| **API endpoint** | POST https://api.attio.com/v2/notes |
| **Auth** | OAuth 2.0 Authorization Code Grant |
| **Required scopes** | note:read-write, object\_configuration:read, record\_permission:read |
| **Content format** | Markdown (headings, lists, bold, italic, links supported) |
| **Phase 1 (Option A)** | User selects a default parent record during setup. All meeting notes attach to this record. |
| **Future (Option C)** | Auto-match attendees to Attio contacts by email. Attach note to the matched contact/company. |

## **2.2 OAuth Flow**

Attio uses standard OAuth 2.0 Authorization Code Grant. The flow follows the same pattern as your existing Google and Slack connections.

**Flow Steps**

• User clicks “Connect Attio” in Settings \> Connections.

• Nexus redirects to Attio’s authorization endpoint with client\_id, redirect\_uri, scopes, and a CSRF state parameter.

• User authorises Nexus in the Attio consent screen.

• Attio redirects back to Nexus callback URL with an authorization code.

• Nexus backend exchanges the code for access\_token and refresh\_token via POST to Attio’s token endpoint.

• Tokens are encrypted and stored in user\_connector\_config.oauth\_tokens.

• Nexus fetches the user’s Attio objects and records to populate the configuration step.

| Publication Requirement Attio requires new OAuth apps to be approved before they work across workspaces. During development, the integration will only work within the workspace where the app is hosted. Plan to submit for publication approval before any external beta testing. |
| :---- |

## **2.3 Configuration (Post-OAuth)**

After connecting, the user must select a default record to attach meeting notes to. This is the Option A implementation.

**Configuration UI**

• Step 1: Nexus calls GET /v2/objects to list available object types (People, Companies, Deals, custom objects).

• Step 2: User selects an object type (e.g., “Companies”).

• Step 3: Nexus calls POST /v2/records/{object}/query to list records of that type. Display as a searchable dropdown.

• Step 4: User selects a specific record (e.g., “Acme Corp”).

• Step 5: Selection is stored in config\_json as:

{

  "parent\_object": "companies",

  "parent\_record\_id": "891dcbfc-9141-415d-9b2a-2238a6cc012d",

  "parent\_record\_name": "Acme Corp",   // For display in Settings UI

  "matching\_strategy": "manual"          // Future: 'attendee\_email\_match'

}

## **2.4 Delivery: Payload Transformation**

The Attio connector transforms the MeetingSummaryPayload into a markdown-formatted note.

**API Request**

POST https://api.attio.com/v2/notes

Authorization: Bearer {access\_token}

Content-Type: application/json

{

  "data": {

    "parent\_object": "{config.parent\_object}",

    "parent\_record\_id": "{config.parent\_record\_id}",

    "title": "{payload.meetingTitle} — {formatted\_date}",

    "format": "markdown",

    "content": "{transformed\_markdown}"

  }

}

**Markdown Template**

\# {meetingTitle}

\*\*Date:\*\* {meetingDate}

\*\*Attendees:\*\* {attendees.map(a \=\> a.name).join(', ')}

\*\*Source:\*\* \[View in Nexus\]({nexusUrl})

\#\# Summary

{summary}

\#\# Decisions

{decisions.map(d \=\> \`- ${d}\`).join('\\n')}

\#\# Action Items

{actionItems.map(a \=\> \`- \*\*${a.owner}:\*\* ${a.task}\`).join('\\n')}

\#\# Follow-Ups

{followUps.map(f \=\> \`- ${f}\`).join('\\n')}

## **2.5 Error Handling**

| Error | Handling | Retry Strategy |
| :---- | :---- | :---- |
| 401 Unauthorized | Token expired. Attempt refresh. If refresh fails, mark connection as Disconnected and alert user. | Auto-retry after refresh |
| 403 Forbidden | Insufficient scopes or record access denied. Surface to user with guidance to reconnect. | No retry — user action required |
| 404 Not Found | Parent record was deleted in Attio. Prompt user to select a new default record in Settings. | No retry — config update required |
| 422 Validation Error | Payload rejected. Log full error. Likely a formatting issue in markdown content. | No retry — investigate |
| 429 Rate Limited | Back off and retry with exponential delay. Attio rate limits are per-workspace. | Auto-retry with backoff |
| 5xx Server Error | Attio is down. Retry with exponential backoff up to 3 attempts. | Auto-retry (max 3\) |

## **2.6 Option C: Attendee Matching (Future Design)**

When Option C is implemented, the connector’s deliver() method will call a RecordMatchingStrategy before constructing the API request. The strategy interface:

interface RecordMatchingStrategy {

  resolve(attendees: Attendee\[\], userConfig: UserConnectorConfig): Promise\<{

    parent\_object: string;

    parent\_record\_id: string;

  } | null\>;  // null \= no match found, fall back to default record

}

class ManualSelection implements RecordMatchingStrategy {

  // Option A: always returns the user's configured default record

  async resolve(attendees, config) {

    return { parent\_object: config.parent\_object, parent\_record\_id: config.parent\_record\_id };

  }

}

class AttendeeEmailMatch implements RecordMatchingStrategy {

  // Option C: searches Attio contacts by attendee email

  async resolve(attendees, config) {

    for (const attendee of attendees) {

      if (\!attendee.email) continue;

      const match \= await attioApi.searchRecords('people', { email: attendee.email });

      if (match) return { parent\_object: 'people', parent\_record\_id: match.id };

    }

    return null; // No match — fall back to ManualSelection

  }

}

Action for now: Implement ManualSelection. Wire the strategy pattern into the connector so swapping to AttendeeEmailMatch is a config change, not a code rewrite.

# **3\. ClickUp Connector**

## **3.1 Overview**

| Property | Detail |
| :---- | :---- |
| **Connector ID** | clickup |
| **Action** | Create a Doc in a user-selected workspace and space/folder |
| **API endpoint** | POST https://api.clickup.com/api/v3/workspaces/{workspaceId}/docs |
| **Page content** | POST /api/v3/workspaces/{workspaceId}/docs/{docId}/pages |
| **Auth** | OAuth 2.0 or Personal API Token (support both) |
| **Content format** | Markdown (page content supports markdown and plaintext) |

## **3.2 OAuth Flow**

ClickUp supports both OAuth 2.0 and personal API tokens. For Nexus, implement OAuth as the primary method (consistent with Google and Slack) with personal API token as a fallback for power users.

**Flow Steps**

• User clicks “Connect ClickUp” in Settings \> Connections.

• Nexus redirects to https://app.clickup.com/api with client\_id and redirect\_uri.

• User authorises Nexus in the ClickUp consent screen.

• ClickUp redirects back with an authorization code.

• Nexus exchanges the code for an access\_token via POST https://api.clickup.com/api/v2/oauth/token.

• Token stored encrypted in user\_connector\_config.oauth\_tokens.

• Nexus fetches the user’s workspace hierarchy to populate configuration.

Note: ClickUp OAuth tokens do not expire but can be revoked. Implement healthCheck() as a lightweight GET /api/v2/user call to verify the token is still valid.

## **3.3 Configuration (Post-OAuth)**

After connecting, the user selects where meeting docs should be created.

**Configuration UI**

• Step 1: Nexus calls GET /api/v2/team to get the user’s workspaces.

• Step 2: If multiple workspaces, user selects one. If only one, auto-select.

• Step 3: Nexus calls GET /api/v2/team/{team\_id}/space to list spaces. User selects a space.

• Step 4: Optionally, user can drill into a folder within the space. If no folder selected, Doc is created at the space root.

• Step 5: Selection stored in config\_json as:

{

  "workspace\_id": "12345678",

  "workspace\_name": "My Workspace",

  "space\_id": "87654321",

  "space\_name": "Engineering",

  "folder\_id": null,              // Optional: null \= space root

  "folder\_name": null

}

## **3.4 Delivery: Payload Transformation**

The ClickUp connector creates a Doc, then adds a page with the formatted meeting summary content.

**Step 1: Create Doc**

POST https://api.clickup.com/api/v3/workspaces/{workspace\_id}/docs

Authorization: {access\_token}

Content-Type: application/json

{

  "name": "{payload.meetingTitle} — {formatted\_date}",

  "parent": {

    "id": "{config.folder\_id || config.space\_id}",

    "type": "{config.folder\_id ? 'folder' : 'space'}"

  },

  "visibility": "private"

}

**Step 2: Create Page with Content**

POST https://api.clickup.com/api/v3/workspaces/{workspace\_id}/docs/{doc\_id}/pages

Authorization: {access\_token}

Content-Type: application/json

{

  "name": "Meeting Summary",

  "content": "{transformed\_markdown}",

  "content\_format": "markdown"

}

**Markdown Template**

Same template structure as the Attio connector — both consume the same payload and produce markdown. The only difference is the wrapper (Attio Note vs ClickUp Doc Page).

\# {meetingTitle}

\*\*Date:\*\* {meetingDate}

\*\*Attendees:\*\* {attendees.map(a \=\> a.name).join(', ')}

\*\*Duration:\*\* {meetingDuration} minutes

\*\*Source:\*\* \[View in Nexus\]({nexusUrl})

\---

\#\# Summary

{summary}

\#\# Key Topics

{topics.map(t \=\> \`- ${t}\`).join('\\n')}

\#\# Decisions

{decisions.map(d \=\> \`- ${d}\`).join('\\n')}

\#\# Action Items

{actionItems.map(a \=\> \`- \*\*${a.owner}:\*\* ${a.task}${a.deadline ? \` (by ${a.deadline})\` : ''}\`).join('\\n')}

\#\# Follow-Ups

{followUps.map(f \=\> \`- ${f}\`).join('\\n')}

| Shared Markdown Formatter Since both Attio and ClickUp accept markdown, extract the payload-to-markdown transformation into a shared utility function. Each connector calls formatSummaryAsMarkdown(payload) and wraps the result in the destination-specific API call. This avoids duplicating the template and ensures consistent formatting across all markdown-capable destinations. |
| :---- |

## **3.5 Error Handling**

| Error | Handling | Retry Strategy |
| :---- | :---- | :---- |
| 401 Unauthorized | Token revoked. Prompt user to reconnect via OAuth. | No retry — user action required |
| 403 Forbidden | User lacks permission to create Docs in the selected space/folder. | No retry — config change required |
| 404 Not Found | Space or folder deleted. Prompt user to update their config in Settings. | No retry — config update required |
| 429 Rate Limited | ClickUp enforces 100 requests per minute per token. Back off and retry. | Auto-retry with backoff |
| 5xx Server Error | ClickUp is down. Retry with exponential backoff up to 3 attempts. | Auto-retry (max 3\) |

# **4\. Settings UI Changes**

## **4.1 Connections Section**

Add Attio and ClickUp to the existing Connections card in Settings. Follow the same visual pattern as Google Account and Slack.

| Field | Attio | ClickUp |
| :---- | :---- | :---- |
| Display name | Attio CRM | ClickUp |
| Status states | Connected / Disconnected | Connected / Disconnected |
| Detail when connected | Workspace name \+ record name | Workspace name \+ space name |
| Actions | Connect / Reconnect / Disconnect | Connect / Reconnect / Disconnect |
| Config step | Select object type → Select record | Select workspace → Select space/folder |

## **4.2 Output Destination Section**

Replace the current single-select dropdown with an additive toggle list. This resolves GAP-002.

• **Nexus History:** Always on. No toggle. Shown as a greyed-out enabled row.

• **Slack DM:** Toggle on/off. Only visible when Slack is connected.

• **Attio CRM:** Toggle on/off. Only visible when Attio is connected and configured.

• **ClickUp:** Toggle on/off. Only visible when ClickUp is connected and configured.

Each toggle maps to an enabled flag in the user\_connector\_config table. Multiple destinations can be enabled simultaneously.

## **4.3 Workflows Section**

Extend the Workflows card to include per-destination delivery toggles. This resolves GAP-003.

• Auto-summarise — Process new transcripts automatically (existing)

• Slack DM on ready — Send summary to Slack DM when complete (new, resolves GAP-003)

• Attio note on ready — Create note in Attio when complete (new)

• ClickUp doc on ready — Create doc in ClickUp when complete (new)

# **5\. Implementation Plan**

## **5.1 Prerequisites (from Phase 1 Gap Analysis)**

These items from the gap analysis should be completed before or in parallel with connector development:

| Gap | What | Why It Blocks Connectors |
| :---- | :---- | :---- |
| **GAP-002** | Additive destination model | Connectors need multiple destinations per summary. Single-select dropdown must become toggle list. |
| **GAP-010** | Connector interface abstraction | The interface contract defined in Section 1 must be implemented before building individual connectors. |
| **GAP-001** | Meeting title cleanup | Clean titles are part of the summary payload. Connectors use meetingTitle for note/doc names. |
| **GAP-003** | Slack DM toggle | Establishes the per-destination workflow toggle pattern that Attio and ClickUp will follow. |

## **5.2 Suggested Sequence**

**Sprint 1: Foundation**

• Resolve GAP-002: Refactor destination model to additive (delivery\_log table, multi-destination fan-out).

• Resolve GAP-010: Implement Connector interface, refactor Slack and NexusHistory as concrete implementations.

• Resolve GAP-001: Add title cleanup to summarisation pipeline, populate meetingTitle in payload.

• Resolve GAP-003: Add Slack DM workflow toggle.

• Define and validate MeetingSummaryPayload schema. Ensure attendee emails are populated.

**Sprint 2: Attio Connector**

• Register Nexus as an OAuth app in Attio developer dashboard.

• Implement OAuth flow (connect, callback, token storage, refresh).

• Build configuration UI: object type selector → record selector.

• Implement AttioConnector.deliver() with ManualSelection strategy.

• Add to Settings UI: connection card, output toggle, workflow toggle.

• Error handling and delivery logging.

• End-to-end test: meeting → summary → Attio note created on correct record.

**Sprint 3: ClickUp Connector**

• Register Nexus as an OAuth app in ClickUp.

• Implement OAuth flow.

• Build configuration UI: workspace → space → optional folder selector.

• Implement ClickUpConnector.deliver() (create doc \+ create page).

• Add to Settings UI: connection card, output toggle, workflow toggle.

• Error handling and delivery logging.

• End-to-end test: meeting → summary → ClickUp doc created in correct space.

**Sprint 4: Polish and Hardening**

• History page updated to show multiple destinations per summary.

• Dashboard connection panel updated for Attio \+ ClickUp status.

• Health check implementation for both connectors (periodic token validation).

• Retry logic for transient failures.

• Submit Attio OAuth app for publication approval.

• Documentation and user-facing setup guides.

## **5.3 Effort Estimates**

| Work Item | Estimate | Notes |
| :---- | :---- | :---- |
| Foundation (interface, routing, payload schema) | **3–4 days** | Must be done first. Unblocks both connectors. |
| Attio OAuth \+ config UI | **2–3 days** | Standard OAuth. Config UI is the main work. |
| Attio delivery \+ error handling | **1–2 days** | Single API call with markdown body. |
| ClickUp OAuth \+ config UI | **2–3 days** | Workspace hierarchy navigation adds complexity. |
| ClickUp delivery \+ error handling | **1–2 days** | Two API calls (create doc, create page). |
| Settings UI refactor (additive model) | **2–3 days** | Reworking the destination section. |
| History page \+ delivery log UI | **1–2 days** | Show multiple destinations per row. |
| Testing \+ hardening | **2–3 days** | End-to-end flows, error paths, token refresh. |

**Total estimated range:** 14–22 engineering days for both connectors including foundation work.

| Risk: Attio Publication Approval Attio requires OAuth app approval before cross-workspace usage. This is an external dependency with unknown turnaround time. Mitigation: submit the app for approval at the start of Sprint 2, develop and test against the hosting workspace, and plan for a buffer before external beta. ClickUp does not have this restriction. |
| :---- |

# **6\. Testing Checklist**

## **6.1 Attio**

• OAuth connect flow completes and tokens are stored encrypted

• OAuth disconnect removes tokens and marks connection as Disconnected

• Configuration UI loads object types and records from Attio

• Selecting a record persists to config\_json correctly

• Meeting summary creates a Note on the correct Attio record

• Note title matches cleaned meeting title format

• Note content is valid markdown and renders correctly in Attio

• Attendee names appear in the note body

• Token refresh works when access token expires

• Deleted parent record triggers clear error message and config update prompt

• Rate limiting is handled gracefully with backoff

• Failed delivery is logged and surfaced to user with retry option

• Disabling the Attio toggle stops delivery without disconnecting

## **6.2 ClickUp**

• OAuth connect flow completes and tokens are stored encrypted

• OAuth disconnect removes tokens and marks connection as Disconnected

• Configuration UI loads workspaces, spaces, and folders from ClickUp

• Selecting a space/folder persists to config\_json correctly

• Meeting summary creates a Doc in the correct ClickUp space/folder

• Doc name matches cleaned meeting title format

• Doc page content is valid markdown and renders correctly in ClickUp

• Creating a Doc in a folder (not just space root) works correctly

• Token revocation is detected by healthCheck and user is prompted to reconnect

• Rate limiting (100 req/min) is handled gracefully

• Failed delivery is logged and surfaced to user with retry option

• Disabling the ClickUp toggle stops delivery without disconnecting

## **6.3 Cross-Connector**

• A single meeting summary can be delivered to Nexus History \+ Slack \+ Attio \+ ClickUp simultaneously

• Failure in one destination does not block delivery to other destinations

• History page correctly shows all destinations a summary was delivered to

• Enabling/disabling destinations takes effect on the next summary (not retroactively)

• Delivery log records all attempts, successes, and failures per destination

• Dashboard KPIs still render correctly with multi-destination data