/**
 * Pull-based Slack mention fetcher using search.messages API.
 *
 * Uses the user's OAuth token (with `search:read` scope) to find recent
 * @mentions across the entire workspace in a single API call.
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

/**
 * Search Slack for recent @mentions of the given user.
 *
 * One API call via `search.messages` with query `<@slackUserId>`.
 * Requires a user OAuth token with `search:read` scope.
 */
export async function fetchRecentMentions(
  slackUserId: string,
  userToken: string,
  sinceHoursAgo = 24
): Promise<SlackMention[]> {
  const after = new Date(Date.now() - sinceHoursAgo * 3600 * 1000)
    .toISOString()
    .split("T")[0]; // YYYY-MM-DD format for Slack search

  const query = `<@${slackUserId}> after:${after}`;

  const url = new URL(`${SLACK_API}/search.messages`);
  url.searchParams.set("query", query);
  url.searchParams.set("sort", "timestamp");
  url.searchParams.set("sort_dir", "desc");
  url.searchParams.set("count", "100");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${userToken}` },
  });

  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    messages?: {
      total: number;
      matches: Array<{
        iid: string;
        ts: string;
        text: string;
        user: string;
        username: string;
        channel: { id: string; name: string };
        permalink: string;
        thread_ts?: string;
      }>;
    };
  };

  if (!data.ok) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "slack_search_failed",
        error: data.error,
      })
    );
    return [];
  }

  const matches = data.messages?.matches ?? [];

  console.log(
    JSON.stringify({
      level: "info",
      event: "slack_mentions_fetched",
      total: data.messages?.total ?? 0,
      returned: matches.length,
    })
  );

  return matches.map((m) => ({
    channelId: m.channel.id,
    channelName: m.channel.name,
    messageTs: m.ts,
    threadTs: m.thread_ts,
    authorId: m.user,
    authorName: m.username || m.user,
    content: m.text,
    permalink: m.permalink,
  }));
}

