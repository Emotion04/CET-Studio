"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Send, RefreshCw, Loader2, BookmarkPlus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StreamText } from "@/components/StreamText";
import { ResizableSplit } from "@/components/ResizableSplit";
import { chatStream } from "@/lib/api";
import { addEntry } from "@/lib/error-book";
import { showToast } from "@/lib/toast";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/animations";
import type { CETLevel, FeedbackState, ReadingSubtype } from "@/lib/types";

interface ReadingViewProps {
  level: CETLevel;
  feedbackState: FeedbackState;
  onFeedbackChange: (state: FeedbackState) => void;
}

interface ReadingRound {
  id: string;
  task: Record<string, unknown> | null;
  answers: Record<string, string>;
  feedback: Record<string, unknown> | null;
  feedbackLoading: boolean;
}

const READING_SUBTYPES: Array<{ id: ReadingSubtype; label: string; en: string; desc: string }> = [
  { id: "banked-cloze", label: "选词填空", en: "Banked Cloze / 15选10", desc: "一篇短文，10个空格，15个词选。考察词汇和语境判断。" },
  { id: "paragraph-matching", label: "长篇阅读 / 信息匹配", en: "Paragraph Matching", desc: "一篇长文，10个信息句，匹配段落来源。" },
  { id: "careful-reading", label: "仔细阅读", en: "Careful Reading", desc: "两篇短文，各5道选择题。考察深层理解和推理判断。" },
];

const subtypeLabels: Record<ReadingSubtype, string> = { "banked-cloze": "选词填空", "paragraph-matching": "长篇阅读", "careful-reading": "仔细阅读" };

// ─── Serialize task for AI ──────────────────────────────────

function serializeTaskForAI(subtype: ReadingSubtype, task: Record<string, unknown>): string {
  switch (subtype) {
    case "banked-cloze": {
      const passage = task.passage as string;
      const wordBank = task.wordBank as Array<{ letter: string; word: string }> | undefined;
      let text = "【文章（含题号标识）】\n" + passage;
      if (wordBank) text += "\n\n【词库（15选10，字母A–O）】\n" + wordBank.map((w) => `${w.letter}) ${w.word}`).join("\n");
      text += "\n\n说明：文章中有10个编号的空格（26–35）。学生需要从15个词库选项中选10个填入。每个选项只能用一次。";
      return text;
    }
    case "paragraph-matching": {
      const title = task.title as string;
      const paragraphs = task.paragraphs as Array<{ letter: string; text: string }> | undefined;
      const statements = task.statements as Array<{ number: number; text: string }> | undefined;
      let text = "【文章标题】" + title;
      if (paragraphs) text += "\n\n【段落（A–O）】\n" + paragraphs.map((p) => `[${p.letter}] ${p.text}`).join("\n\n");
      if (statements) text += "\n\n【信息句（36–45）】\n" + statements.map((s) => `${s.number}. ${s.text}`).join("\n");
      return text;
    }
    case "careful-reading": {
      const passages = task.passages as Array<{ number: number; text: string; title: string }> | undefined;
      const questions = task.questions as Array<{ number: number; question: string; options: Array<{ letter: string; text: string }>; passageNumber: number }> | undefined;
      let text = "";
      if (passages) text += passages.map((p) => "【" + p.title + "】\n" + p.text).join("\n\n");
      if (questions) text += "\n\n【题目（46–55）】\n" + questions.map((q) => {
        const opts = q.options.map((o) => `${o.letter}. ${o.text}`).join("  ");
        return `${q.number}. ${q.question}\n   ${opts}\n  （出自第${q.passageNumber}篇）`;
      }).join("\n\n");
      return text;
    }
  }
}

// ─── Main Component ─────────────────────────────────────────

export function ReadingView({ level, feedbackState, onFeedbackChange }: ReadingViewProps) {
  const [subtype, setSubtype] = useState<ReadingSubtype | null>(null);
  const [rounds, setRounds] = useState<ReadingRound[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [error, setError] = useState("");

  const activeRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

  // Generate task for the latest round
  const loadTaskForRound = useCallback((roundId: string, st: ReadingSubtype) => {
    setGenLoading(true);
    setError("");
    chatStream(
      { mode: "reading", action: "generate", context: { level, subtype: st } },
      () => {},
      (text) => {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const data = JSON.parse(match[0]);
            setRounds((prev) => prev.map((r) => (r.id === roundId ? { ...r, task: data } : r)));
            setGenLoading(false);
          } catch { /* wait */ }
        }
      },
      (err) => { setError(err.message); setGenLoading(false); }
    );
  }, [level]);

  // When a new round is added (task === null), generate task
  useEffect(() => {
    if (activeRound && !activeRound.task && !genLoading && subtype) {
      loadTaskForRound(activeRound.id, subtype);
    }
  }, [activeRound, genLoading, subtype, loadTaskForRound]);

  // Initialize first round when subtype is selected
  const handleSelectSubtype = useCallback((st: ReadingSubtype) => {
    setSubtype(st);
    setRounds([{ id: crypto.randomUUID(), task: null, answers: {}, feedback: null, feedbackLoading: false }]);
  }, []);

  // Submit answers for the active round
  const handleSubmit = useCallback((roundId: string) => {
    setRounds((prev) => prev.map((r) => (r.id === roundId ? { ...r, feedbackLoading: true } : r)));
  }, []);

  // Load feedback for a round
  useEffect(() => {
    if (!activeRound || !activeRound.feedbackLoading || !activeRound.task || !subtype) return;
    let cancelled = false;
    const answerStr = Object.entries(activeRound.answers).map(([k, v]) => `${k}${v}`).join(" ");
    const taskText = serializeTaskForAI(subtype, activeRound.task);
    const answerKey = activeRound.task.answerKey as Record<string, string> | undefined;
    chatStream(
      { mode: "reading", action: "feedback", userInput: answerStr, context: { subtype, taskText, answerKey: answerKey ? JSON.stringify(answerKey) : "" } },
      () => {},
      (text) => {
        if (cancelled) return;
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const fb = JSON.parse(match[0]);
            setRounds((prev) => prev.map((r) => (r.id === activeRound.id ? { ...r, feedback: fb, feedbackLoading: false } : r)));
          } catch { /* wait */ }
        }
      },
      () => { if (!cancelled) setRounds((prev) => prev.map((r) => (r.id === activeRound.id ? { ...r, feedbackLoading: false } : r))); }
    );
    return () => { cancelled = true; };
  }, [activeRound?.feedbackLoading]);

  // "再来一题" — add a new round below
  const handleNextRound = useCallback(() => {
    setRounds((prev) => [...prev, { id: crypto.randomUUID(), task: null, answers: {}, feedback: null, feedbackLoading: false }]);
  }, []);

  if (!subtype) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="max-w-md w-full mx-auto px-6 text-center">
          <BookOpen size={40} className="mx-auto mb-4 text-[var(--accent)]" />
          <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>选择阅读题型</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">题目风格基于 2015–2025 年真题趋势分析</p>
          <div className="space-y-3">
            {READING_SUBTYPES.map((s) => (
              <button key={s.id} onClick={() => handleSelectSubtype(s.id)}
                className="w-full text-left p-4 rounded-xl border border-[var(--border)] hover:border-[var(--ring)]/50 hover:bg-[var(--secondary)]/30 transition-all duration-200 cursor-pointer group">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold group-hover:text-[var(--accent)] transition-colors">{s.label}</span>
                  <span className="text-[10px] text-[var(--muted-foreground)] uppercase">{s.en}</span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">{s.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-6 space-y-8">
      {/* Round selector pills */}
      {rounds.length > 1 && (
        <div className="flex items-center gap-2">
          {rounds.map((r, i) => (
            <span key={r.id} className={`text-xs px-2.5 py-1 rounded-full ${i === rounds.length - 1 ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium" : "bg-[var(--secondary)] text-[var(--muted-foreground)]"}`}>
              第 {i + 1} 轮
            </span>
          ))}
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {rounds.map((round, i) => (
          <motion.div
            key={round.id}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            layout
          >
            {/* Loading task */}
            {!round.task && !round.feedback && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
                <p className="text-sm text-[var(--muted-foreground)]">AI 正在生成阅读题目...</p>
                <div className="max-w-sm w-full"><StreamText /></div>
              </div>
            )}

            {/* Active task — user answering */}
            {round.task && !round.feedback && !round.feedbackLoading && (
              <div className="flex flex-col lg:flex-row gap-0 border border-[var(--border)] rounded-2xl overflow-hidden">
                {/* Left: Passage */}
                <div className="flex-1 border-b lg:border-b-0 lg:border-r border-[var(--border)] bg-[var(--card)] flex flex-col min-h-0">
                  <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen size={14} className="text-[var(--accent)]" />
                      <span className="text-xs font-medium text-[var(--accent)] uppercase tracking-wider">{subtypeLabels[subtype]}</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <ReadingContent subtype={subtype} task={round.task} />
                  </div>
                </div>
                {/* Right: Answers */}
                <div className="w-full lg:w-[380px] shrink-0 flex flex-col min-h-0">
                  <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)]">
                    <span className="text-xs text-[var(--muted-foreground)]">作答区</span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setRounds((prev) => prev.map((r) => (r.id === round.id ? { ...r, answers: {} } : r)))} disabled={Object.keys(round.answers).length === 0}>
                        <RefreshCw size={14} />清空
                      </Button>
                      <Button size="sm" variant="accent" onClick={() => handleSubmit(round.id)} disabled={Object.keys(round.answers).length < 5} className="gap-1.5">
                        <Send size={14} />提交
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-4">
                    <AnswerInput subtype={subtype} task={round.task} answers={round.answers}
                      onAnswerChange={(a) => setRounds((prev) => prev.map((r) => (r.id === round.id ? { ...r, answers: a } : r)))} />
                  </div>
                </div>
              </div>
            )}

            {/* Feedback loading */}
            {round.feedbackLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
                <p className="text-sm text-[var(--muted-foreground)]">AI 正在批改...</p>
                <div className="max-w-md w-full"><StreamText /></div>
              </div>
            )}

            {/* Feedback display */}
            {round.feedback && round.task && (
              <ReadingFeedbackCard
                subtype={subtype}
                task={round.task}
                answers={round.answers}
                feedback={round.feedback}
                level={level}
                onNextRound={handleNextRound}
                onRetry={() => setRounds((prev) => prev.map((r) => (r.id === round.id ? { ...r, feedback: null, answers: {} } : r)))}
                isLast={i === rounds.length - 1}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 再来一题 trigger — shown after last feedback */}
      {activeRound?.feedback && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="text-center pb-8">
          <Button variant="primary" size="lg" onClick={handleNextRound} className="gap-2 px-8">
            <RefreshCw size={16} /> 再来一题
          </Button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Passage Renderer ───────────────────────────────────────

function ReadingContent({ subtype, task }: { subtype: ReadingSubtype; task: Record<string, unknown> }) {
  if (subtype === "banked-cloze") {
    const passage = (task.passage as string) || "";
    const wordBank = task.wordBank as Array<{ letter: string; word: string }> | undefined;
    return (
      <div className="space-y-5">
        <p className="text-xs text-[var(--muted-foreground)] italic leading-relaxed">{task.instruction as string}</p>
        <div className="text-sm leading-relaxed text-[var(--foreground)]">
          {passage.split(/\[\d+\]/).map((seg, i) => {
            if (i === 0) return <span key={i}>{seg}</span>;
            const num = 25 + i;
            return <span key={i}><span className="inline-block min-w-[70px] border-b-2 border-[var(--accent)] text-center text-[var(--accent)] font-medium mx-0.5">{num}</span>{seg}</span>;
          })}
        </div>
        {wordBank && (
          <div>
            <h4 className="text-xs font-semibold mb-2 text-[var(--muted-foreground)]">Word Bank (A–O)</h4>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {wordBank.map((w) => <span key={w.letter} className="font-mono">{w.letter}) {w.word}</span>)}
            </div>
          </div>
        )}
        <p className="text-[10px] text-[var(--muted-foreground)] text-center">{task.label as string}</p>
      </div>
    );
  }
  if (subtype === "paragraph-matching") {
    const title = task.title as string;
    const paragraphs = task.paragraphs as Array<{ letter: string; text: string }> | undefined;
    const statements = task.statements as Array<{ number: number; text: string }> | undefined;
    return (
      <div className="space-y-5">
        <p className="text-xs text-[var(--muted-foreground)] italic leading-relaxed">{task.instruction as string}</p>
        <h3 className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
        {paragraphs?.map((p) => (
          <div key={p.letter} className="text-sm leading-relaxed">
            <span className="inline-block w-7 h-6 rounded bg-[var(--secondary)] text-center text-xs font-semibold mr-2">[{p.letter}]</span>
            <span>{p.text}</span>
          </div>
        ))}
        {statements && (
          <div className="pt-3 border-t border-[var(--border)]">
            <h4 className="text-xs font-semibold mb-2 text-[var(--muted-foreground)]">Statements 36–45</h4>
            {statements.map((s) => <p key={s.number} className="text-xs text-[var(--muted-foreground)] mb-1">{s.number}. {s.text}</p>)}
          </div>
        )}
        <p className="text-[10px] text-[var(--muted-foreground)] text-center">{task.label as string}</p>
      </div>
    );
  }
  // careful-reading
  const passages = task.passages as Array<{ number: number; text: string; title: string }> | undefined;
  const questions = task.questions as Array<{ number: number; question: string; options: Array<{ letter: string; text: string }>; passageNumber: number }> | undefined;
  return (
    <div className="space-y-6">
      {passages?.map((p) => (
        <div key={p.number}>
          <h3 className="text-base font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>{p.title}</h3>
          <p className="text-sm leading-relaxed text-[var(--foreground)]">{p.text}</p>
        </div>
      ))}
      {questions && (
        <div>
          <h4 className="text-sm font-semibold mb-3 text-[var(--muted-foreground)]">Questions</h4>
          <div className="space-y-3 text-xs">
            {questions.map((q) => (
              <div key={q.number}>
                <p className="mb-1">{q.number}. {q.question}</p>
                <div className="grid grid-cols-2 gap-1 ml-4 text-[11px] text-[var(--muted-foreground)]">
                  {q.options.map((o) => <span key={o.letter}>{o.letter}. {o.text}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-[10px] text-[var(--muted-foreground)] text-center">{task.label as string}</p>
    </div>
  );
}

// ─── Answer Input ──────────────────────────────────────────

function AnswerInput({ subtype, task, answers, onAnswerChange }: {
  subtype: ReadingSubtype; task: Record<string, unknown> | null; answers: Record<string, string>;
  onAnswerChange: (a: Record<string, string>) => void;
}) {
  if (subtype === "banked-cloze") {
    const items = Array.from({ length: 10 }, (_, i) => i + 26);
    return (
      <div className="space-y-2">
        <p className="text-[10px] text-[var(--muted-foreground)] mb-2">格式：26A 27F 28C ...</p>
        <div className="grid grid-cols-5 gap-1.5">
          {items.map((num) => (
            <div key={num} className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-[var(--muted-foreground)]">{num}</span>
              <input value={answers[num] || ""} onChange={(e) => onAnswerChange({ ...answers, [num]: e.target.value.toUpperCase().slice(0, 1) })}
                className="w-9 h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] text-center text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent" maxLength={1} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (subtype === "paragraph-matching") {
    const items = Array.from({ length: 10 }, (_, i) => i + 36);
    return (
      <div className="space-y-1.5">
        <p className="text-[10px] text-[var(--muted-foreground)] mb-2">格式：36C 37A 38F ...</p>
        <div className="grid grid-cols-2 gap-1.5">
          {items.map((num) => (
            <div key={num} className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-[var(--muted-foreground)] w-5">{num}</span>
              <input value={answers[num] || ""} onChange={(e) => onAnswerChange({ ...answers, [num]: e.target.value.toUpperCase().slice(0, 1) })}
                className="w-10 h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] text-center text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent" maxLength={1} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  const items = Array.from({ length: 10 }, (_, i) => i + 46);
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-[var(--muted-foreground)] mb-2">格式：46A 47C 48D ...</p>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((num) => (
          <div key={num} className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-[var(--muted-foreground)] w-5">{num}</span>
            <input value={answers[num] || ""} onChange={(e) => onAnswerChange({ ...answers, [num]: e.target.value.toUpperCase().slice(0, 1) })}
              className="w-10 h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] text-center text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent" maxLength={1} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feedback Card (one per round) ─────────────────────────

function ReadingFeedbackCard({ subtype, task, answers, feedback, level, onNextRound, onRetry, isLast }: {
  subtype: ReadingSubtype;
  task: Record<string, unknown>;
  answers: Record<string, string>;
  feedback: Record<string, unknown>;
  level: CETLevel;
  onNextRound: () => void;
  onRetry: () => void;
  isLast: boolean;
}) {
  const f = feedback;
  const answerKey = f.answers as Record<string, string> | undefined;
  const evidence = f.evidence as Record<string, string> | undefined;
  const errorDiag = f.errorDiagnosis as string[] | undefined;

  const handleAddError = () => {
    const correctAnswers = f.answers as Record<string, string> | undefined;
    const wrongItems = correctAnswers
      ? Object.entries(correctAnswers).filter(([num, ans]) => answers[parseInt(num)] !== ans).map(([num]) => num)
      : [];
    addEntry({
      mode: "reading", readingSubtype: subtype, level,
      title: task.title as string | undefined,
      task,
      userAnswer: answers,
      answerKey: correctAnswers,
      wordBank: task.wordBank as Array<{ letter: string; word: string }> | undefined,
      feedback: f as Record<string, unknown>,
      wrongItems,
    });
    showToast("success", `已加入错题本 · ${wrongItems.length} 题错误`);
  };

  return (
    <ResizableSplit
      left={
        <Card className="h-full">
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>
            {(task.title as string) || "原文回顾"}
          </h3>
          <div className="max-h-[65vh] overflow-auto text-sm">
            <ReadingContent subtype={subtype} task={task} />
          </div>
        </Card>
      }
      right={
        <div className="space-y-3 min-w-0">
          {answerKey && (
            <Card>
              <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>正确答案</h3>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(answerKey).map(([num, ans]) => (
                  <span key={num} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${answers[parseInt(num)] === ans ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--error)]/10 text-[var(--error)]"}`}>
                    <span className="opacity-60">{num}</span><span className="font-semibold">{ans}</span>
                  </span>
                ))}
              </div>
            </Card>
          )}

          {evidence && (
            <Card>
              <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>定位依据</h3>
              <div className="space-y-1.5 max-h-[40vh] overflow-auto text-xs text-[var(--muted-foreground)]">
                {Object.entries(evidence).map(([num, ev]) => (
                  <p key={num}><span className="font-semibold text-[var(--foreground)]">{num}.</span> {ev}</p>
                ))}
              </div>
            </Card>
          )}

          {errorDiag && errorDiag.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold mb-2" style={{ fontFamily: "var(--font-display)" }}>错因诊断</h3>
              <ul className="text-xs text-[var(--muted-foreground)] space-y-1.5">
                {errorDiag.map((d, i) => <li key={i} className="flex gap-1.5"><span className="text-[var(--error)] font-bold">·</span>{d}</li>)}
              </ul>
            </Card>
          )}

          <div className="flex items-center gap-2 pt-1">
            {isLast && <Button variant="primary" size="sm" onClick={onNextRound} className="gap-1"><RefreshCw size={13} />再来一题</Button>}
            <Button variant="ghost" size="sm" onClick={onRetry}>重新作答</Button>
            <Button variant="ghost" size="sm" onClick={handleAddError} className="gap-1"><BookmarkPlus size={13} />错题本</Button>
          </div>
        </div>
      }
    />
  );
}
