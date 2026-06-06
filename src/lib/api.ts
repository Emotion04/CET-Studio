import type { ModeType, ActionType } from "./prompts";
import type { ModelProvider } from "./types";
import { getStoredKey, getActiveModel, getModelForProvider } from "./api-key-store";
import { tokenEvents } from "./token-events";

const API_BASE = "/api/chat";

interface ChatParams {
  mode: ModeType;
  action: ActionType;
  userInput?: string;
  context?: Record<string, string>;
  provider?: ModelProvider;
}

function getHeaders(provider: ModelProvider): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const storedKey = getStoredKey(provider);
  if (storedKey) {
    headers["x-api-key"] = storedKey;
  }
  headers["x-provider"] = provider;
  return headers;
}

function resolveProvider(params: ChatParams): ModelProvider {
  return params.provider || getActiveModel();
}

// Non-streaming helper for simpler cases
export async function chat(params: ChatParams): Promise<unknown> {
  const provider = resolveProvider(params);
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: getHeaders(provider),
    body: JSON.stringify({ ...params, provider, model: getModelForProvider(provider) }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  // If it's a stream response, accumulate and parse
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    return accumulateStream(response);
  }

  return response.json();
}

// Token estimation for mixed CN/EN text (BPE approximation)
function estimateTokens(text: string): number {
  let cjk = 0;
  let latin = 0;
  for (const ch of text) {
    if (/[一-鿿　-〿＀-￯]/.test(ch)) {
      cjk++;
    } else if (/\s/.test(ch)) {
    } else {
      latin++;
    }
  }
  return Math.max(1, Math.ceil(cjk * 0.65 + latin * 0.25));
}

// Streaming helper with callback
export async function chatStream(
  params: ChatParams,
  onToken: (token: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: Error) => void,
): Promise<void> {
  const provider = resolveProvider(params);
  tokenEvents.reset();
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: getHeaders(provider),
      body: JSON.stringify({ ...params, provider, model: getModelForProvider(provider) }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content || "";
          if (content) {
            fullText += content;
            onToken(content);
            tokenEvents.add(estimateTokens(content), content);
          }
        } catch {
          // Skip malformed lines
        }
      }
    }

    onDone(fullText);
    tokenEvents.finalize();
  } catch (err) {
    onError(err instanceof Error ? err : new Error("Stream error"));
  }
}

async function accumulateStream(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        fullText += parsed.choices?.[0]?.delta?.content || "";
      } catch {
        // skip
      }
    }
  }

  // Parse accumulated JSON
  const cleaned = fullText.trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return { raw: cleaned };
}
