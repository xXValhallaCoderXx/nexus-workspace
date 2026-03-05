export interface OpenRouterOptions {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userContent: string;
  responseFormat?: "json_object";
}

export interface OpenRouterResponse {
  content: string;
  model: string;
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 60_000;

export async function callOpenRouter(
  options: OpenRouterOptions
): Promise<OpenRouterResponse> {
  const { apiKey, model, systemPrompt, userContent, responseFormat } = options;

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
      }),
      signal: controller.signal,
    });

    if (response.status === 401) {
      throw new Error("Invalid OpenRouter API key");
    }
    if (response.status === 429) {
      throw new Error("OpenRouter rate limit exceeded. Please try again later.");
    }
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenRouter error (${response.status}): ${errorBody}`);
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
