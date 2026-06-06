import type { ModelProvider } from "./types";

// ─── Available model versions per provider ───────────────────

export interface ModelOption {
  value: string;
  label: string;
}

export const MODEL_OPTIONS: Record<ModelProvider, ModelOption[]> = {
  deepseek: [
    { value: "deepseek-v4-flash", label: "Flash" },
    { value: "deepseek-v4-pro", label: "Pro)" },
  ],
  mimo: [
    { value: "mimo-v2-flash", label: "MiMo V2 Flash" },
    { value: "mimo-v2.5-pro", label: "MiMo V2.5 Pro" },
  ],
  qwen: [
    { value: "qwen3.6-flash", label: "Qwen 3.6 Flash" },
    { value: "qwen3.6-max", label: "Qwen 3.6 Max" },
    { value: "qwen3.6-turbo", label: "Qwen 3.6 Turbo" },
  ],
};

// ─── Active provider ─────────────────────────────────────────

const ACTIVE_MODEL_KEY = "cet-studio-active-model";

export function getActiveModel(): ModelProvider {
  if (typeof window === "undefined") return "deepseek";
  return (localStorage.getItem(ACTIVE_MODEL_KEY) as ModelProvider) || "deepseek";
}

export function setActiveModel(provider: ModelProvider): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_MODEL_KEY, provider);
}

// ─── Selected model version per provider ─────────────────────

const MODEL_VERSION_PREFIX = "cet-studio-model-version";

function modelVersionKey(provider: ModelProvider): string {
  return `${MODEL_VERSION_PREFIX}-${provider}`;
}

export function getModelForProvider(provider: ModelProvider): string {
  if (typeof window === "undefined") return MODEL_OPTIONS[provider][0].value;
  const stored = localStorage.getItem(modelVersionKey(provider));
  return stored && MODEL_OPTIONS[provider].some((o) => o.value === stored)
    ? stored
    : MODEL_OPTIONS[provider][0].value;
}

export function setModelForProvider(provider: ModelProvider, model: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(modelVersionKey(provider), model);
}

// ─── API key storage per provider ────────────────────────────

const KEY_PREFIX = "cet-studio-api-key";

function storageKey(provider: ModelProvider): string {
  return `${KEY_PREFIX}-${provider}`;
}

function migrateLegacyKey(): void {
  if (typeof window === "undefined") return;
  const legacy = localStorage.getItem(KEY_PREFIX);
  if (legacy) {
    localStorage.setItem(storageKey("deepseek"), legacy);
    localStorage.removeItem(KEY_PREFIX);
  }
}
migrateLegacyKey();

export function getStoredKey(provider: ModelProvider): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(storageKey(provider)) || "";
}

export function storeKey(provider: ModelProvider, key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(provider), key);
}

export function clearKey(provider: ModelProvider): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(provider));
}
