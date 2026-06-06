import { buildSystemPrompt } from "@/lib/prompts";
import type { ModeType, ActionType } from "@/lib/prompts";
import type { ModelProvider } from "@/lib/types";

const PROVIDER_CONFIG: Record<ModelProvider, { url: string; defaultModel: string; authHeader: string; authPrefix: string }> = {
  deepseek: {
    url: "https://api.deepseek.com/chat/completions",
    defaultModel: "	deepseek-v4-flash",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
  },
  mimo: {
    url: "https://api.xiaomimimo.com/v1/chat/completions",
    defaultModel: "mimo-v2.5",
    authHeader: "api-key",
    authPrefix: "",
  },
  qwen: {
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    defaultModel: "qwen3.6-flash",
    authHeader: "Authorization",
    authPrefix: "Bearer ",
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      mode,
      action,
      userInput,
      context,
      provider = "deepseek",
      model,
    }: {
      mode: ModeType;
      action: ActionType;
      userInput?: string;
      context?: Record<string, string>;
      provider?: ModelProvider;
      model?: string;
    } = body;

    if (!mode || !action) {
      return Response.json({ error: "mode and action are required" }, { status: 400 });
    }

    const cfg = PROVIDER_CONFIG[provider] ?? PROVIDER_CONFIG.deepseek;
    const selectedModel = model || cfg.defaultModel;

    const systemPrompt = buildSystemPrompt(mode, action, {
      ...context,
      level: context?.level || "CET-4",
    });

    let userMessage = userInput || "";

    if (action === "generate") {
      userMessage = `请为 {{level}} 级别生成{{modeLabel}}练习。${userMessage || ""}`
        .replace("{{level}}", context?.level || "CET-4")
        .replace("{{modeLabel}}", modeLabels[mode] || mode);
    }

    if (action === "feedback" && context) {
      userMessage = buildFeedbackMessage(mode, userInput || "", context);
    }

    // Key priority: user-provided header > environment variable
    const apiKey =
      req.headers.get("x-api-key") ||
      envKeyForProvider(provider);

    if (!apiKey) {
      return Response.json(
        { error: `No API key found for ${provider}. Set it in the header bar or add the environment variable.` },
        { status: 500 }
      );
    }

    const response = await fetch(cfg.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [cfg.authHeader]: `${cfg.authPrefix}${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return Response.json(
        { error: `${provider} API error: ${response.status}`, detail: err },
        { status: response.status }
      );
    }

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

const modeLabels: Record<ModeType, string> = {
  writing: "写作",
  translation: "翻译",
  reading: "阅读",
  listening: "听力",
  "study-plan": "学习规划",
};

function buildFeedbackMessage(
  mode: ModeType,
  userInput: string,
  context: Record<string, string>
): string {
  switch (mode) {
    case "writing":
      return `写作题目：${context.topic || ""}\n\n学生作文：\n${userInput}\n\n请按评分标准进行批改。`;

    case "translation":
      return `中文原文：${context.passage || ""}\n\n学生译文：\n${userInput}\n\n请从信息完整度、准确性、语法、自然度、中式英语等维度批改。`;

    case "reading":
      return `阅读类型：${context.subtype || ""}\n\n${context.taskText || ""}\n\n${context.answerKey ? "【正确答案（已确定）】\n" + context.answerKey + "\n\n注意：上方的正确答案是题目生成时已确定的，请直接使用它作为答案对照。不需要重新判断正确答案。\n\n" : ""}学生答案：\n${userInput}\n\n请提供正确答案、定位依据、推理路径、干扰项分析和错因诊断。`;

    case "listening":
      return `学生答案：\n${userInput}\n\n请提供正确答案、听力线索、解释和下次练习建议。`;

    default:
      return userInput;
  }
}

function envKeyForProvider(provider: ModelProvider): string | undefined {
  switch (provider) {
    case "deepseek":
      return process.env.DEEPSEEK_API_KEY;
    case "mimo":
      return process.env.MIMO_API_KEY;
    case "qwen":
      return process.env.QWEN_API_KEY;
  }
}
