import type { SectionMode, ReadingSubtype } from "./types";

export interface ErrorBookEntry {
  id: string;
  mode: SectionMode;
  readingSubtype?: ReadingSubtype;
  level: string;
  title?: string;
  task: Record<string, unknown>;
  userAnswer: Record<string, string> | string;
  answerKey?: Record<string, string>;
  /** Word bank for banked-cloze — used to show "A.word" in error display */
  wordBank?: Array<{ letter: string; word: string }>;
  feedback: Record<string, unknown> | null;
  wrongItems: string[]; // question numbers the user got wrong, e.g. ["26", "28"]
  createdAt: number;
}

const STORAGE_KEY = "cet-studio-error-book";

function getAll(): ErrorBookEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAll(entries: ErrorBookEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addEntry(entry: Omit<ErrorBookEntry, "id" | "createdAt">) {
  const entries = getAll();
  entries.unshift({
    ...entry,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  });
  saveAll(entries);
}

export function removeEntry(id: string) {
  saveAll(getAll().filter((e) => e.id !== id));
}

export function getEntries(mode?: SectionMode): ErrorBookEntry[] {
  const all = getAll();
  return mode ? all.filter((e) => e.mode === mode) : all;
}

export function getEntryCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of getAll()) {
    const key = e.readingSubtype ? `reading-${e.readingSubtype}` : e.mode;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}
