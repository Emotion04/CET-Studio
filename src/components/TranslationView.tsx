"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Languages, Send, RefreshCw, Lightbulb, CheckCircle2,
  AlertCircle, Loader2, BookmarkPlus, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StreamText } from "@/components/StreamText";
import { chatStream } from "@/lib/api";
import { addEntry } from "@/lib/error-book";
import { showToast } from "@/lib/toast";
import type { CETLevel, FeedbackState } from "@/lib/types";

interface TranslationViewProps {
  level: CETLevel;
  feedbackState: FeedbackState;
  onFeedbackChange: (state: FeedbackState) => void;
}

export function TranslationView({ level, feedbackState, onFeedbackChange }: TranslationViewProps) {
  const [passage, setPassage] = useState("");
  const [loadingPassage, setLoadingPassage] = useState(true);
  const [translation, setTranslation] = useState("");

  useEffect(() => {
    let cancelled = false;
    let fullText = "";
    setLoadingPassage(true);
    chatStream(
      { mode: "translation", action: "generate", context: { level } },
      () => {},
      (text) => {
        if (cancelled) return;
        fullText = text;
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            const data = JSON.parse(match[0]);
            setPassage(data.passage || "");
            setLoadingPassage(false);
          } catch { /* wait */ }
        }
      },
      () => { if (!cancelled) setLoadingPassage(false); }
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const handleSubmit = useCallback(() => {
    if (translation.trim().length < 10) return;
    onFeedbackChange("reviewing");
  }, [translation, onFeedbackChange]);

  if (feedbackState === "reviewing") {
    return (
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-6">
        <TranslationFeedback
          translation={translation}
          source={passage}
          level={level}
          onRetry={() => onFeedbackChange("idle")}
          onNext={() => {
            onFeedbackChange("idle");
            setTranslation("");
            setLoadingPassage(true);
            setPassage("");
            // Trigger reload
            chatStream(
              { mode: "translation", action: "generate", context: { level } },
              () => {},
              (text) => {
                const match = text.match(/\{[\s\S]*\}/);
                if (match) {
                  try {
                    const data = JSON.parse(match[0]);
                    setPassage(data.passage || "");
                    setLoadingPassage(false);
                  } catch { /* wait */ }
                }
              },
              () => setLoadingPassage(false)
            );
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-6xl mx-auto w-full">
      <div className="flex-1 border-r border-[var(--border)] bg-[var(--card)] flex flex-col min-h-0">
        <div className="p-5 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Languages size={16} className="text-[var(--success)]" />
            <span className="text-xs font-medium text-[var(--success)] uppercase tracking-wider">Translation Task</span>
          </div>
          <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: "var(--font-display)" }}>中译英</h2>
        </div>
        <div className="px-5 pb-5 flex-1 overflow-auto">
          {loadingPassage ? (
            <div className="flex flex-col items-center gap-2 text-sm text-[var(--muted-foreground)] py-12 justify-center">
              <Loader2 size={16} className="animate-spin" />
              <span>AI 正在生成翻译段落...</span>
              <div className="max-w-sm w-full"><StreamText /></div>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-[var(--secondary)]/60 p-5">
                <p className="text-base leading-relaxed text-[var(--foreground)]">{passage}</p>
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-4 text-center">以下为原创 CET-style 仿真模拟训练</p>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-5 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)]">
          <span className="text-xs text-[var(--muted-foreground)]">英文翻译</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setTranslation("")} disabled={translation.length === 0}>
              <RefreshCw size={14} /> 清空
            </Button>
            <Button size="sm" variant="accent" onClick={handleSubmit} disabled={translation.trim().length < 10} className="gap-1.5">
              <Send size={14} /> 提交批改
            </Button>
          </div>
        </div>
        <textarea
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          placeholder={passage ? "在此输入你的英文译文..." : "等待题目生成..."}
          disabled={!passage}
          className="flex-1 w-full resize-none p-5 text-sm leading-relaxed bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none disabled:opacity-50"
          style={{ fontFamily: "var(--font-body)" }}
        />
      </div>
    </div>
  );
}

function TranslationFeedback({ translation, source, level, onRetry, onNext }: {
  translation: string; source: string; level: CETLevel;
  onRetry: () => void; onNext: () => void;
}) {
  const [feedback, setFeedback] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    chatStream(
      { mode: "translation", action: "feedback", userInput: translation, context: { level, passage: source } },
      () => {},
      (text) => {
        if (cancelled) return;
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try { setFeedback(JSON.parse(match[0])); setLoading(false); } catch { /* wait */ }
        }
      },
      (err) => { if (!cancelled) { setError(err.message); setLoading(false); } }
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="flex flex-col items-center justify-center py-20 gap-3"><Loader2 size={28} className="animate-spin text-[var(--success)]" /><p className="text-sm text-[var(--muted-foreground)]">AI 正在批改...</p><div className="max-w-md w-full"><StreamText /></div></div>;
  if (error || !feedback) return <div className="text-center py-20"><p className="text-sm text-[var(--error)]">{error || "批改失败"}</p><Button variant="ghost" onClick={onNext} className="mt-3">跳过</Button></div>;

  const f = feedback as Record<string, unknown>;
  const chinglish = f.chinglish as string[] | undefined;
  const expressions = f.expressions as string[] | undefined;
  const [showHighScore, setShowHighScore] = useState(false);

  return (
    <div className="w-[84%] mx-auto space-y-6 animate-fade-up">
      {/* Score */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">AI估分</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{f.score as number}</span>
              <span className="text-sm text-[var(--muted-foreground)]">/ 15</span>
              <span className="px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-medium">{level}</span>
            </div>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">{translation.trim().split(/\s+/).filter(Boolean).length} 词</span>
        </div>
      </Card>

      {/* Source text */}
      <Card>
        <h3 className="text-xs font-semibold text-[var(--muted-foreground)] mb-3 uppercase tracking-wider">原文</h3>
        <p className="text-base leading-relaxed text-[var(--foreground)]">{source}</p>
      </Card>

      {/* Diagnosis */}
      <Card>
        <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>诊断</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={15} className="text-[var(--success)] mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-medium">信息完整度</span>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{f.completeness as string}</p>
            </div>
          </div>
          {(f.errors as string[])?.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertCircle size={15} className="text-[var(--error)] mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-medium">误译 / 漏译</span>
                <ul className="text-xs text-[var(--muted-foreground)] mt-1 space-y-1">
                  {(f.errors as string[]).map((e, i) => <li key={i}>· {e}</li>)}
                </ul>
              </div>
            </div>
          )}
          {chinglish && chinglish.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertCircle size={15} className="text-[var(--accent)] mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-medium">中式英语</span>
                <ul className="text-xs text-[var(--muted-foreground)] mt-1 space-y-1">
                  {chinglish.map((c, i) => <li key={i}>· {c}</li>)}
                </ul>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Lightbulb size={15} className="text-[var(--accent)] mt-0.5 shrink-0" />
            <div>
              <span className="text-xs font-medium">句法建议</span>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5 leading-relaxed">{f.structure as string}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Two-column: User translation vs Standard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs font-semibold text-[var(--muted-foreground)] mb-3 uppercase tracking-wider">你的翻译</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{translation}</p>
        </Card>
        <Card>
          <h3 className="text-xs font-semibold text-[var(--success)] mb-3 uppercase tracking-wider">标准译文</h3>
          <p className="text-sm leading-relaxed">{f.standard as string}</p>
        </Card>
      </div>

      {/* Collapsible high-score version */}
      <Card>
        <button
          onClick={() => setShowHighScore(!showHighScore)}
          className="w-full flex items-center justify-between cursor-pointer"
        >
          <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">高分译文</h3>
          {showHighScore ? <ChevronUp size={16} className="text-[var(--muted-foreground)]" /> : <ChevronDown size={16} className="text-[var(--muted-foreground)]" />}
        </button>
        {showHighScore && (
          <div className="mt-3 p-4 rounded-xl bg-[var(--secondary)]/60">
            <p className="text-sm leading-relaxed">{f.highScore as string}</p>
          </div>
        )}
      </Card>

      {expressions && expressions.length > 0 && (
        <Card>
          <h4 className="text-xs font-semibold mb-2 text-[var(--muted-foreground)]">可复用表达</h4>
          <div className="flex flex-wrap gap-2">
            {expressions.map((e) => (
              <span key={e} className="px-2.5 py-1 rounded-lg bg-[var(--success)]/8 text-[var(--success)] text-xs cursor-pointer hover:bg-[var(--success)]/15 transition-colors">{e}</span>
            ))}
          </div>
        </Card>
      )}

      {(f.miniDrill as string) && (
        <Card><h4 className="text-xs font-semibold mb-2">针对性小练习</h4><p className="text-xs text-[var(--muted-foreground)]">{f.miniDrill as string}</p></Card>
      )}

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={onNext} className="gap-1.5"><RefreshCw size={14} /> 再来一题</Button>
        <Button variant="ghost" onClick={onRetry}>重新翻译</Button>
        <Button
          variant="ghost"
          onClick={() => {
            addEntry({
              mode: "translation",
              level,
              task: { passage: source },
              userAnswer: translation,
              feedback,
              wrongItems: [],
            });
            showToast("success", "已加入错题本");
          }}
          className="gap-1.5"
        >
          <BookmarkPlus size={14} /> 加入错题本
        </Button>
      </div>
    </div>
  );
}
