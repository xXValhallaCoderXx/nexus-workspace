/**
 * Pull-based Slack mention fetcher.
 *
 * Uses the Slack Web API (bot token) to scan channels for recent @mentions
 * of a given user. This powers the "Sync Now" feature — instead of relying
 * on push-based webhooks, we actively query Slack for new mentions.
 */

const SLACK_API = "https://slack.com/api";

export interface SlackMention {
  channelId: string;
  channelName: string;
  messageTs: string;
  threadTs?: string;
  authorId: string;
  authorName: string;
  content: string;
  permalink?: string;
}

async function slackGet(
  endpoint: string,
  botToken: string,
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  const url = new URL(`${SLACK_API}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${botToken}` },
  });
  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Fetch recent @mentions of a user across all channels the bot is in.
 *
 * Scans channel history and thread replies for `<@slackUserId>` patterns.
 * Rate-limited to a reasonable number of API calls.
 */
export async function fetchRecentMentions(
  slackUserId: string,
  botToken: string,
  sinceHoursAgo = 24
): Promise<SlackMention[]> {
  const oldest = String(
    Math.floor((Date.now() - sinceHoursAgo * 3600 * 1000) / 1000)
  );

  // List channels the bot is in
  const channelsRes = await slackGet("conversations.list", botToken, {
    types: "public_channel,private_channel",
    exclude_archived: "true",
    limit: "200",
  });

  if (!channelsRes.ok) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "slack_list_channels_failed",
        error: channelsRes.error,
      })
    );
    return [];
  }

  type SlackChannel = { id: string; name: string };
  type SlackMessage = {
    user?: string;
    text?: string;
    ts: string;
    thread_ts?: string;
    reply_count?: number;
  };

  const channels = (channelsRes.channels ?? []) as SlackChannel[];
  const mentionPattern = `<@${slackUserId}>`;
  const mentions: SlackMention[] = [];
  const userNameCache = new Map<string, string>();

  // Cap at 20 channels to avoid API rate limits
  for (const channel of channels.slice(0, 20)) {
    const historyRes = await slackGet("conversations.history", botToken, {
      channel: channel.id,
      oldest,
      limit: "100",
    });

    if (!historyRes.ok) continue;

    const messages = (historyRes.messages ?? []) as SlackMessage[];

    for (const msg of messages) {
      // Check top-level message
      if (msg.text?.includes(mentionPattern)) {
        const authorName = await resolveUserName(
          msg.user ?? "unknown",
          botToken,
          userNameCache
        );
        mentions.push({
          channelId: channel.id,
          channelName: channel.name,
          messageTs: msg.ts,
          authorId: msg.user ?? "unknown",
          authorName,
          content: msg.text,
          permalink: buildPermalink(channel.id, msg.ts),
        });
      }

      // Check thread replies (mentions in threads don't appear in channel history)
      if (msg.reply_count && msg.reply_count > 0) {
        const repliesRes = await slackGet("conversations.replies", botToken, {
          channel: channel.id,
          ts: msg.ts,
          oldest,
          limit: "100",
        });

        if (!repliesRes.ok) continue;

        const replies = (repliesRes.messages ?? []) as SlackMessage[];
        for (const reply of replies) {
          if (reply.ts === msg.ts) continue; // skip parent (already checked)
          if (reply.text?.includes(mentionPattern)) {
            const authorName = await resolveUserName(
              reply.user ?? "unknown",
              botToken,
              userNameCache
            );
            mentions.push({
              channelId: channel.id,
              channelName: channel.name,
              messageTs: reply.ts,
              threadTs: msg.ts,
              authorId: reply.user ?? "unknown",
              authorName,
              content: reply.text,
              permalink: buildPermalink(channel.id, reply.ts, msg.ts),
            });
          }
        }
      }
    }
  }

  console.log(
    JSON.stringify({
      level: "info",
      event: "slack_mentions_fetched",
      channelsScanned: Math.min(channels.length, 20),
      mentionsFound: mentions.length,
    })
  );

  return mentions;
}

async function resolveUserName(
  userId: string,
  botToken: string,
  cache: Map<string, string>
): Promise<string> {
  if (cache.has(userId)) return cache.get(userId)!;

  try {
    const res = await slackGet("users.info", botToken, { user: userId });
    if (res.ok) {
      const user = res.user as Record<string, unknown> | undefined;
      const profile = user?.profile as Record<string, string> | undefined;
      const name =
        profile?.display_name || profile?.real_name || (user?.name as string) || userId;
      cache.set(userId, name);
      return name;
    }
  } catch {
    // Fall through to use raw ID
  }

  cache.set(userId, userId);
  return userId;
}

function buildPermalink(
  channelId: string,
  ts: string,
  threadTs?: string
): string {
  const base = `https://slack.com/archives/${channelId}/p${ts.replace(".", "")}`;
  return threadTs ? `${base}?thread_ts=${threadTs}` : base;
}
