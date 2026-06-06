import type { ModelProvider } from "@/lib/types";

const PROVIDER_CONFIG: Record<ModelProvider, { url: string; model: string; authHeader: string; authPrefix: string }> = {
  deepseek: {
    url: "https://api.deepseek.com/chat/completions",
    model: "deepseek-chat",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
  },
  mimo: {
    url: "https://api.xiaomimimo.com/v1/chat/completions",
    model: "mimo-v2.5",
    authHeader: "api-key",
    authPrefix: "",
  },
  qwen: {
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    model: "qwen-plus",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
  },
};

export async function POST(req: Request) {
  try {
    const { provider, apiKey } = await req.json() as { provider: ModelProvider; apiKey: string };

    if (!provider || !apiKey) {
      return Response.json({ ok: false, error: "Missing provider or apiKey" }, { status: 400 });
    }

    const cfg = PROVIDER_CONFIG[provider];
    if (!cfg) {
      return Response.json({ ok: false, error: `Unknown provider: ${provider}` }, { status: 400 });
    }

    // Send a minimal test request — 1 token reply to verify connectivity
    const response = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [cfg.authHeader]: `${cfg.authPrefix}${apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: "user", content: "hi" }],
        max_tokens: 1,
        stream: false,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      return Response.json({ ok: true });
    }

    const errText = await response.text().catch(() => "");
    let detail = "";
    try {
      const err = JSON.parse(errText);
      detail = (err.error?.message as string) || (err.message as string) || errText.slice(0, 200);
    } catch {
      detail = errText.slice(0, 200);
    }
    return Response.json({ ok: false, error: `HTTP ${response.status}`, detail });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ ok: false, error: message });
  }
}
