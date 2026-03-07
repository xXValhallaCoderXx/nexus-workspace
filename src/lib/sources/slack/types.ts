// Slack Events API payload types
// See: https://api.slack.com/events-api#receiving_events

export interface SlackUrlVerificationEvent {
  type: "url_verification";
  challenge: string;
  token: string;
}

export interface SlackAppMentionEvent {
  type: "app_mention";
  user: string;
  text: string;
  channel: string;
  ts: string;
  event_ts: string;
  team?: string;
}

export type SlackEvent = SlackAppMentionEvent;

export interface SlackEventCallback {
  type: "event_callback";
  token: string;
  team_id: string;
  api_app_id: string;
  event: SlackEvent;
  event_id: string;
  event_time: number;
}

export type SlackEventsApiPayload =
  | SlackUrlVerificationEvent
  | SlackEventCallback;
