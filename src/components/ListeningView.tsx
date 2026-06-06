"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Headphones, Play, Pause, Send, RefreshCw, Volume2, Loader2, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StreamText } from "@/components/StreamText";
import { chatStream } from "@/lib/api";
import { addEntry } from "@/lib/error-book";
import { showToast } from "@/lib/toast";
import type { CETLevel, FeedbackState } from "@/lib/types";

interface ListeningViewProps {
  level: CETLevel;
  feedbackState: FeedbackState;
  onFeedbackChange: (state: FeedbackState) => void;
}

export function ListeningView({ level, feedbackState, onFeedbackChange }: ListeningViewProps) {
  const [task, setTask] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    chatStream(
      { mode: "listening", action: "generate", context: { level } },
      () => {},
      (text) => {
        if (cancelled) return;
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try { setTask(JSON.parse(match[0])); setLoading(false); } catch { /* wait */ }
        }
      },
      () => { if (!cancelled) setLoading(false); }
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  if (feedbackState === "reviewing") {
    return (
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-6">
        <ListeningFeedback
          answers={answers}
          task={task}
          level={level}
          onRetry={() => onFeedbackChange("idle")}
          onNew={() => { onFeedbackChange("idle"); setTask(null); setLoading(true); }}
        />
      </div>
    );
  }

  const questions = task?.questions as Array<{
    number: number; question: string; options: Array<{ letter: string; text: string }>;
  }> | undefined;
  const vocabulary = task?.vocabulary as Array<{ word: string; definition: string }> | undefined;

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-6xl mx-auto w-full">
      {/* Left: Audio & Script */}
      <div className="flex-1 border-r border-[var(--border)] bg-[var(--card)] flex flex-col min-h-0">
        <div className="p-5 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Headphones size={16} style={{ color: "#9B6B9E" }} />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "#9B6B9E" }}>Listening</span>
          </div>
          <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: "var(--font-display)" }}>{task?.sceneType as string || "听力理解"}</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-2 text-sm text-[var(--muted-foreground)] py-12 justify-center"><Loader2 size={16} className="animate-spin" /><span>AI 正在生成听力材料...</span><div className="max-w-sm w-full"><StreamText /></div></div>
        ) : (
          <>
            {/* Audio Player */}
            <div className="mx-5 p-5 rounded-2xl bg-[var(--secondary)]/60 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center shadow-sm">
                <Volume2 size={28} className="text-[var(--foreground)]" />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium">{task?.sceneType as string}</p>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">音频时长约 {task?.duration as string}</p>
              </div>
              <Button
                variant="accent" size="sm" onClick={() => setIsPlaying(!isPlaying)}
                className="w-12 h-12 rounded-full p-0"
                style={isPlaying ? {} : {}}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </Button>
              <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: "#9B6B9E", width: isPlaying ? "35%" : "0%" }}
                  animate={isPlaying ? { width: ["0%", "100%"] } : {}}
                  transition={isPlaying ? { duration: 150, repeat: Infinity, ease: "linear" } : {}} />
              </div>
            </div>

            {/* Vocabulary */}
            {vocabulary && vocabulary.length > 0 && (
              <div className="px-5 py-3">
                <h4 className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">预听词汇</h4>
                <div className="flex flex-wrap gap-2">
                  {vocabulary.map((v) => (
                    <span key={v.word} className="px-2 py-1 rounded-lg bg-[var(--secondary)] text-xs"><span className="font-mono font-medium">{v.word}</span><span className="text-[var(--muted-foreground)] ml-1">{v.definition}</span></span>
                  ))}
                </div>
              </div>
            )}

            {/* Script */}
            <div className="px-5 py-4 flex-1 overflow-auto">
              <p className="text-xs text-[var(--muted-foreground)] mb-2">听力脚本（作答后方可查看）</p>
              <div className="rounded-xl bg-[var(--secondary)]/40 p-4 text-xs leading-relaxed text-[var(--muted-foreground)]/70 blur-[3px] select-none">
                {task?.script as string}
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-3 text-center">{task?.label as string}</p>
            </div>
          </>
        )}
      </div>

      {/* Right: Questions */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-5 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)]">
          <span className="text-xs text-[var(--muted-foreground)]">选择答案</span>
          <Button size="sm" variant="accent" onClick={() => onFeedbackChange("reviewing")} disabled={!questions || Object.keys(answers).length < (questions?.length || 0) / 2} className="gap-1.5"><Send size={14} />提交</Button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          {questions && questions.length > 0 ? (
            <div className="space-y-5">
              {questions.map((q) => (
                <div key={q.number} className="animate-fade-up" style={{ animationDelay: `${q.number * 50}ms` }}>
                  <p className="text-xs text-[var(--muted-foreground)] mb-2">Question {q.number}: {q.question}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {q.options.map((opt) => (
                      <button key={opt.letter} onClick={() => setAnswers({ ...answers, [q.number]: opt.letter })}
                        className={`text-left px-3 py-2 rounded-lg border text-xs transition-all duration-150 cursor-pointer ${answers[q.number] === opt.letter ? "border-[var(--ring)] bg-[var(--accent)]/10 text-[var(--foreground)]" : "border-[var(--border)] hover:border-[var(--ring)]/40 text-[var(--muted-foreground)]"}`}>
                        <span className="font-mono font-semibold mr-1.5">{opt.letter}.</span>{opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--muted-foreground)]">等待题目生成...</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ListeningFeedback({ answers, task, level, onRetry, onNew }: {
  answers: Record<string, string>; task: Record<string, unknown> | null; level: CETLevel; onRetry: () => void; onNew: () => void;
}) {
  const [feedback, setFeedback] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const answerStr = Object.entries(answers).map(([k, v]) => `${k}${v}`).join(" ");
    setLoading(true);
    chatStream(
      { mode: "listening", action: "feedback", userInput: answerStr },
      () => {},
      (text) => {
        if (cancelled) return;
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try { setFeedback(JSON.parse(match[0])); setLoading(false); } catch { /* wait */ }
        }
      },
      () => { if (!cancelled) setLoading(false); }
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="flex flex-col items-center justify-center py-20 gap-3"><Loader2 size={28} className="animate-spin" style={{ color: "#9B6B9E" }} /><p className="text-sm text-[var(--muted-foreground)]">AI 正在批改...</p><div className="max-w-md w-full"><StreamText /></div></div>;
  if (!feedback) return <div className="text-center py-20"><p className="text-sm text-[var(--error)]">批改失败</p><Button variant="ghost" onClick={onNew}>跳过</Button></div>;

  const f = feedback as Record<string, unknown>;
  const correct = f.answers as Record<string, string> | undefined;
  const cues = f.cues as Record<string, string> | undefined;
  const errorTypes = f.errorTypes as string[] | undefined;

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>正确答案 & 听力线索</h3>
        <div className="space-y-3">
          {correct && Object.entries(correct).map(([num, ans]) => (
            <div key={num} className="flex items-start gap-3 text-xs">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-mono font-bold ${answers[parseInt(num)] === ans ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--error)]/10 text-[var(--error)]"}`}>{num}</span>
              <div>
                <span className="font-semibold text-[var(--foreground)]">{ans}</span>
                <span className="text-[var(--muted-foreground)] ml-2">{cues?.[num]}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {errorTypes && errorTypes.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>听力错因分析</h3>
          <ul className="text-xs text-[var(--muted-foreground)] space-y-2">{errorTypes.map((e, i) => <li key={i} className="flex gap-2"><span className="text-[var(--error)] font-bold">·</span>{e}</li>)}</ul>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={onNew} className="gap-1.5"><RefreshCw size={14} />再来一题</Button>
        <Button variant="ghost" onClick={onRetry}>重新作答</Button>
        <Button
          variant="ghost"
          onClick={() => {
            const correctAnswers = f.answers as Record<string, string> | undefined;
            const wrongItems = correctAnswers
              ? Object.entries(correctAnswers)
                  .filter(([num, ans]) => answers[parseInt(num)] !== ans)
                  .map(([num]) => num)
              : [];
            addEntry({
              mode: "listening",
              level,
              task: task || {},
              userAnswer: answers,
              answerKey: correctAnswers,
              feedback: f as Record<string, unknown>,
              wrongItems,
            });
            showToast("success", `已加入错题本 · ${wrongItems.length} 题错误`);
          }}
          className="gap-1.5"
        >
          <BookmarkPlus size={14} /> 加入错题本
        </Button>
      </div>
    </div>
  );
}
