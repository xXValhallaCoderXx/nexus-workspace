export interface OpenRouterOptions {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userContent: string;
  responseFormat?: "json_object";
  maxTokens?: number;
}

export interface OpenRouterResponse {
  content: string;
  model: string;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2_000;

export async function callOpenRouter(
  options: OpenRouterOptions
): Promise<OpenRouterResponse> {
  const { apiKey, model, systemPrompt, userContent, responseFormat, maxTokens } =
    options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXTAUTH_URL ?? "http://localhost:3000",
          "X-Title": "Nexus",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          ...(responseFormat
            ? { response_format: { type: responseFormat } }
            : {}),
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
        }),
        signal: controller.signal,
      });

      if (response.status === 401) {
        throw new Error("Invalid OpenRouter API key");
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const waitMs = retryAfter
          ? Number(retryAfter) * 1000
          : BASE_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(
          JSON.stringify({
            level: "warn",
            event: "openrouter_rate_limited",
            attempt: attempt + 1,
            waitMs,
          })
        );
        await sleep(waitMs);
        lastError = new Error("OpenRouter rate limit exceeded");
        continue;
      }

      if (response.status === 502 || response.status === 503) {
        const waitMs = BASE_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(
          JSON.stringify({
            level: "warn",
            event: "openrouter_server_error",
            status: response.status,
            attempt: attempt + 1,
            waitMs,
          })
        );
        await sleep(waitMs);
        lastError = new Error(
          `OpenRouter server error (${response.status})`
        );
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `OpenRouter error (${response.status}): ${errorBody}`
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty response from OpenRouter");
      }

      return { content, model: data.model ?? model };
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("OpenRouter request failed after retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
