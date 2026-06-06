"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Key, Check, X, Eye, EyeOff, Settings } from "lucide-react";
import {
  getStoredKey,
  storeKey,
  clearKey,
  getActiveModel,
  setActiveModel,
  getModelForProvider,
  setModelForProvider,
  MODEL_OPTIONS,
} from "@/lib/api-key-store";
import { showToast } from "@/lib/toast";
import type { ModelProvider } from "@/lib/types";

const PROVIDERS: { id: ModelProvider; label: string; placeholder: string; helpUrl: string }[] = [
  {
    id: "deepseek",
    label: "DeepSeek",
    placeholder: "sk-...",
    helpUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    id: "mimo",
    label: "小米 MiMo",
    placeholder: "mi-...",
    helpUrl: "https://platform.xiaomimimo.com/",
  },
  {
    id: "qwen",
    label: "通义千问",
    placeholder: "sk-...",
    helpUrl: "https://dashscope.console.aliyun.com/apiKey",
  },
];

export function ApiKeyInput() {
  const [open, setOpen] = useState(false);
  const [activeProvider, setActiveProvider] = useState<ModelProvider>("deepseek");
  const [keys, setKeys] = useState<Record<ModelProvider, string>>({ deepseek: "", mimo: "", qwen: "" });
  const [saved, setSaved] = useState<Record<ModelProvider, boolean>>({ deepseek: false, mimo: false, qwen: false });
  const [showKey, setShowKey] = useState(false);
  const [modelVersions, setModelVersions] = useState<Record<ModelProvider, string>>({ deepseek: "", mimo: "", qwen: "" });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const next: Record<string, string> = {};
    const nextSaved: Record<string, boolean> = {};
    const nextVersion: Record<string, string> = {};
    for (const p of PROVIDERS) {
      const k = getStoredKey(p.id);
      next[p.id] = k;
      nextSaved[p.id] = !!k;
      nextVersion[p.id] = getModelForProvider(p.id);
    }
    setKeys((prev) => ({ ...prev, ...next }));
    setSaved((prev) => ({ ...prev, ...nextSaved }));
    setModelVersions((prev) => ({ ...prev, ...nextVersion }));
    setActiveProvider(getActiveModel());
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSave = useCallback(async () => {
    const trimmed = keys[activeProvider].trim();
    if (!trimmed) return;
    const label = PROVIDERS.find((p) => p.id === activeProvider)!.label;
    storeKey(activeProvider, trimmed);
    setSaved((prev) => ({ ...prev, [activeProvider]: true }));
    showToast("success", `已保存 ${label} API Key`);

    // Connectivity test in background
    try {
      const res = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: activeProvider, apiKey: trimmed }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast({ type: "success", message: `${label} 连通正常 ✓`, duration: 5000, lowOpacity: true });
      } else {
        showToast({ type: "error", message: `${label} 连通失败: ${data.detail || data.error}`, duration: 6000, lowOpacity: true });
      }
    } catch {
      showToast({ type: "error", message: `${label} 连通检测超时`, duration: 6000, lowOpacity: true });
    }
  }, [activeProvider, keys]);

  const handleClear = useCallback(() => {
    clearKey(activeProvider);
    setKeys((prev) => ({ ...prev, [activeProvider]: "" }));
    setSaved((prev) => ({ ...prev, [activeProvider]: false }));
  }, [activeProvider]);

  const handleSelectModel = useCallback((p: ModelProvider) => {
    setActiveProvider(p);
    setActiveModel(p);
  }, []);

  const handleVersionChange = useCallback(
    (version: string) => {
      setModelVersions((prev) => ({ ...prev, [activeProvider]: version }));
      setModelForProvider(activeProvider, version);
    },
    [activeProvider]
  );

  const current = PROVIDERS.find((p) => p.id === activeProvider)!;
  const hasAnySaved = saved.deepseek || saved.mimo || saved.qwen;
  const versions = MODEL_OPTIONS[activeProvider];

  return (
    <div ref={ref} className="relative flex items-center gap-1.5">
      {/* Model selector pills */}
      <div className="flex rounded-lg bg-[var(--secondary)] p-0.5">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSelectModel(p.id)}
            className={`text-[10px] px-2 py-1 rounded-md transition-all cursor-pointer ${
              activeProvider === p.id
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
            title={p.label}
          >
            {p.id === "deepseek" ? "DS" : p.id === "mimo" ? "MiMo" : "Qwen"}
          </button>
        ))}
      </div>

      {/* Settings + Key button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
          hasAnySaved
            ? "bg-[var(--success)]/10 text-[var(--success)]"
            : "bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        }`}
        title={hasAnySaved ? "API Key 已保存" : "设置 API Key 与模型版本"}
      >
        <Settings size={12} />
        <span className="hidden sm:inline">{hasAnySaved ? "已配置" : "模型设置"}</span>
      </button>

      {/* Popup */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 p-3 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl z-50">
          {/* Model version selector */}
          <label className="text-[10px] font-medium text-[var(--muted-foreground)] mb-1.5 block">
            模型版本
          </label>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {versions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleVersionChange(opt.value)}
                className={`text-[10px] px-2 py-1 rounded-md border transition-all cursor-pointer ${
                  modelVersions[activeProvider] === opt.value
                    ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--muted-foreground)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* API Key input */}
          <label className="text-[10px] font-medium text-[var(--muted-foreground)] mb-1.5 block">
            {current.label} API Key
          </label>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={keys[activeProvider]}
                onChange={(e) => setKeys((prev) => ({ ...prev, [activeProvider]: e.target.value }))}
                placeholder={current.placeholder}
                className="w-full h-9 pl-3 pr-8 rounded-lg border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent"
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
              >
                {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={!keys[activeProvider].trim()}
              className="w-9 h-9 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center disabled:opacity-40 cursor-pointer hover:opacity-90 transition-opacity"
            >
              <Check size={14} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-2">
            <a
              href={current.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[var(--accent)] hover:underline"
            >
              获取 {current.label} API Key &rarr;
            </a>
            {saved[activeProvider] && (
              <button
                onClick={handleClear}
                className="text-[10px] text-[var(--error)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X size={10} /> 清除
              </button>
            )}
          </div>

          {/* Provider saved indicators */}
          <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-[var(--border)]">
            {PROVIDERS.map((p) => (
              <span
                key={p.id}
                className={`text-[10px] flex items-center gap-1 ${activeProvider === p.id ? "font-medium text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${saved[p.id] ? "bg-[var(--success)]" : "bg-[var(--border)]"}`}
                />
                {p.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
