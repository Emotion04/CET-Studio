"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, BookOpen, Trash2, RotateCcw, ChevronDown, ChevronUp,
  Pencil, Languages, Headphones, Calendar, Bookmark, Sparkles, Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getEntries, removeEntry, type ErrorBookEntry } from "@/lib/error-book";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/animations";
import type { SectionMode, ReadingSubtype } from "@/lib/types";

const TABS: { id: SectionMode | "all"; label: string; icon: typeof BookOpen }[] = [
  { id: "all", label: "全部", icon: Bookmark },
  { id: "writing", label: "写作", icon: Pencil },
  { id: "translation", label: "翻译", icon: Languages },
  { id: "reading", label: "阅读", icon: BookOpen },
  { id: "listening", label: "听力", icon: Headphones },
];

const READING_LABELS: Record<ReadingSubtype, string> = {
  "banked-cloze": "选词填空",
  "paragraph-matching": "信息匹配",
  "careful-reading": "仔细阅读",
};

export default function ErrorBookPage() {
  const [entries, setEntries] = useState<ErrorBookEntry[]>([]);
  const [activeTab, setActiveTab] = useState<SectionMode | "all">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [redoEntry, setRedoEntry] = useState<string | null>(null);
  const [redoAnswers, setRedoAnswers] = useState<Record<string, string>>({});
  const [redoChecked, setRedoChecked] = useState(false);

  useEffect(() => {
    setEntries(getEntries());
  }, []);

  const filtered = useMemo(
    () => (activeTab === "all" ? entries : entries.filter((e) => e.mode === activeTab)),
    [entries, activeTab]
  );

  const handleRemove = (id: string) => {
    removeEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleRedo = (entry: ErrorBookEntry) => {
    setRedoEntry(entry.id);
    setRedoAnswers({});
    setRedoChecked(false);
  };

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) {
      c[e.mode] = (c[e.mode] || 0) + 1;
    }
    return c;
  }, [entries]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="h-14 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">返回</span>
            </Link>
            <div className="h-5 w-px bg-[var(--border)]" />
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-[var(--accent)]" />
              <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                错题本
              </span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count = t.id === "all" ? entries.length : (counts[t.id] || 0);
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all shrink-0 cursor-pointer ${
                  activeTab === t.id
                    ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]"
                }`}
              >
                <Icon size={13} />
                {t.label}
                {count > 0 && (
                  <span className="ml-0.5 px-1 py-0.5 rounded text-[10px] bg-[var(--secondary)] leading-none">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <BookOpen size={48} className="text-[var(--border)] mb-4" />
            <p className="text-sm text-[var(--muted-foreground)] mb-1">错题本为空</p>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">做完练习后可以将错题加入错题本</p>
            <Link href="/">
              <Button variant="primary">
                <Sparkles size={14} className="mr-1" /> 去刷题
              </Button>
            </Link>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filtered.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ delay: i * 0.04 }}
                  layout
                >
                  <Card className="overflow-hidden">
                    <button
                      onClick={() => toggle(entry.id)}
                      className="w-full flex items-center justify-between p-4 text-left cursor-pointer hover:bg-[var(--secondary)]/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium ${modeColors[entry.mode] || "bg-[var(--secondary)] text-[var(--muted-foreground)]"}`}>
                          {entry.mode === "reading" && entry.readingSubtype
                            ? READING_LABELS[entry.readingSubtype]
                            : modeLabels[entry.mode]}
                        </span>
                        <div className="min-w-0">
                          {entry.title ? (
                            <p className="text-xs font-medium text-[var(--foreground)] truncate">{entry.title}</p>
                          ) : (
                            <p className="text-xs text-[var(--foreground)] truncate">
                              {typeof entry.userAnswer === "string" ? entry.userAnswer.slice(0, 40) + "…" : entry.level}
                            </p>
                          )}
                          <p className="text-[10px] text-[var(--muted-foreground)]">
                            {entry.level} · {entry.wrongItems.length} 题错误 · {formatTime(entry.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {expanded.has(entry.id) ? <ChevronUp size={14} className="text-[var(--muted-foreground)]" /> : <ChevronDown size={14} className="text-[var(--muted-foreground)]" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {expanded.has(entry.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3 border-t border-[var(--border)] pt-3">
                            {/* Wrong items highlight */}
                            {entry.answerKey && (
                              <div>
                                <p className="text-[10px] font-medium text-[var(--muted-foreground)] mb-1.5">错题标记</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(entry.answerKey).map(([num, ans]) => {
                                    const userAns = typeof entry.userAnswer === "object" ? entry.userAnswer[num] : undefined;
                                    const isWrong = entry.wrongItems.includes(num);
                                    const correctWord = entry.wordBank?.find((w) => w.letter === ans)?.word;
                                    const userWord = userAns ? entry.wordBank?.find((w) => w.letter === userAns)?.word : undefined;
                                    const correctLabel = correctWord ? `${ans}. ${correctWord}` : ans;
                                    const userLabel = userWord ? `${userAns}. ${userWord}` : (userAns || "");
                                    return (
                                      <span
                                        key={num}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                                          isWrong
                                            ? "bg-[var(--error)]/10 text-[var(--error)]"
                                            : "bg-[var(--success)]/10 text-[var(--success)]"
                                        }`}
                                      >
                                        <span className="opacity-60">{num}</span>
                                        {isWrong ? (
                                          <span className="line-through opacity-60">{userLabel}</span>
                                        ) : (
                                          <span>{correctLabel}</span>
                                        )}
                                        {isWrong && <span className="font-semibold">→ {correctLabel}</span>}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* User answer preview (for writing/translation) */}
                            {typeof entry.userAnswer === "string" && entry.userAnswer && (
                              <div>
                                <p className="text-[10px] font-medium text-[var(--muted-foreground)] mb-1">你的作答</p>
                                <p className="text-xs text-[var(--muted-foreground)] bg-[var(--secondary)]/50 rounded-lg p-2 max-h-32 overflow-auto">
                                  {entry.userAnswer.slice(0, 300)}{entry.userAnswer.length > 300 ? "…" : ""}
                                </p>
                              </div>
                            )}

                            {/* In-place redo */}
                            {redoEntry === entry.id && (
                              <motion.div variants={fadeUp} initial="hidden" animate="visible" className="border-t border-[var(--border)] pt-3 space-y-3">
                                <p className="text-[10px] font-medium text-[var(--accent)]">重新练习 — 输入答案后点击检查</p>
                                {entry.answerKey && (
                                  <RedoAnswerInput entry={entry} answers={redoAnswers} onChange={setRedoAnswers} checked={redoChecked} />
                                )}
                                <div className="flex items-center gap-2">
                                  <Button variant="primary" size="sm" onClick={() => redoChecked ? (setRedoEntry(null), setRedoChecked(false), setRedoAnswers({})) : setRedoChecked(true)} className="gap-1">
                                    {redoChecked ? <><RotateCcw size={12} /> 重新练习</> : <><Check size={12} /> 检查答案</>}
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => { setRedoEntry(null); setRedoChecked(false); setRedoAnswers({}); }}>
                                    <X size={12} /> 取消
                                  </Button>
                                </div>
                                {redoChecked && entry.answerKey && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {Object.entries(entry.answerKey).map(([num, ans]) => {
                                      const correct = redoAnswers[parseInt(num)] === ans;
                                      return (
                                        <span key={num} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${correct ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--error)]/10 text-[var(--error)]"}`}>
                                          <span className="opacity-60">{num}</span>
                                          <span>{redoAnswers[parseInt(num)] || "—"}</span>
                                          {!correct && <span className="font-semibold">→ {ans}</span>}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </motion.div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              {redoEntry !== entry.id && (
                                <Button variant="primary" size="sm" onClick={() => handleRedo(entry)} className="gap-1">
                                  <RotateCcw size={12} /> 重新练习
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => handleRemove(entry.id)} className="gap-1 text-[var(--error)]">
                                <Trash2 size={12} /> 移除
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

const modeLabels: Record<string, string> = {
  writing: "写作", translation: "翻译", reading: "阅读", listening: "听力", "study-plan": "学习规划",
};

const modeColors: Record<string, string> = {
  writing: "bg-[#C8963E]/10 text-[#C8963E]",
  translation: "bg-[#6B8F71]/10 text-[#6B8F71]",
  reading: "bg-[#5B7FA5]/10 text-[#5B7FA5]",
  listening: "bg-[#9B6B9E]/10 text-[#9B6B9E]",
};

function RedoAnswerInput({ entry, answers, onChange, checked }: {
  entry: ErrorBookEntry;
  answers: Record<string, string>;
  onChange: (a: Record<string, string>) => void;
  checked: boolean;
}) {
  if (!entry.answerKey) return null;
  const nums = Object.keys(entry.answerKey).sort((a, b) => parseInt(a) - parseInt(b));
  const isReading = entry.mode === "reading" || entry.mode === "listening";

  if (isReading) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {nums.map((num) => (
          <div key={num} className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-[var(--muted-foreground)] w-5">{num}</span>
            <input
              value={answers[parseInt(num)] || ""}
              onChange={(e) => onChange({ ...answers, [parseInt(num)]: e.target.value.toUpperCase().slice(0, 1) })}
              className={`w-9 h-7 rounded border text-center text-[10px] font-mono focus:outline-none focus:ring-1 ${checked ? (answers[parseInt(num)] === entry.answerKey![num] ? "border-[var(--success)] bg-[var(--success)]/10" : "border-[var(--error)] bg-[var(--error)]/10") : "border-[var(--border)] bg-[var(--background)] focus:ring-[var(--ring)]"}`}
              maxLength={1}
              disabled={checked}
            />
          </div>
        ))}
      </div>
    );
  }

  // Writing/translation — text input
  return (
    <textarea
      value={answers[0] || ""}
      onChange={(e) => onChange({ 0: e.target.value })}
      placeholder="输入你的答案..."
      disabled={checked}
      className="w-full h-24 p-2 rounded border border-[var(--border)] bg-[var(--background)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--ring)] resize-none"
    />
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return "今天 " + d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  if (diff < 172800000) return "昨天";
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}
