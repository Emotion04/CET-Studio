"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Pencil, Send, RefreshCw, Sparkles,
  CheckCircle2, AlertCircle, Lightbulb, Loader2, BookmarkPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { StreamText } from "@/components/StreamText";
import { chatStream } from "@/lib/api";
import { addEntry } from "@/lib/error-book";
import { showToast } from "@/lib/toast";
import type { CETLevel, FeedbackState, WritingTopic } from "@/lib/types";

interface WritingViewProps {
  level: CETLevel;
  feedbackState: FeedbackState;
  onFeedbackChange: (state: FeedbackState) => void;
}

const wordCountTarget: Record<CETLevel, { min: number; max: number }> = {
  "CET-4": { min: 120, max: 180 },
  "CET-6": { min: 150, max: 220 },
};

// ─── Main View ─────────────────────────────────────────────

export function WritingView({ level, feedbackState, onFeedbackChange }: WritingViewProps) {
  const [topics, setTopics] = useState<WritingTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<WritingTopic | null>(null);
  const [essay, setEssay] = useState("");

  // Load topics from API on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingTopics(true);
      let fullText = "";
      try {
        await chatStream(
          { mode: "writing", action: "generate", context: { level } },
          () => {},
          (text) => {
            if (cancelled) return;
            fullText = text;
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
              const data = JSON.parse(match[0]);
              setTopics(data.topics || []);
              setLoadingTopics(false);
            }
          },
          () => {
            if (!cancelled) setLoadingTopics(false);
          }
        );
      } catch {
        if (!cancelled) setLoadingTopics(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const wordCount = useMemo(
    () => essay.trim().split(/\s+/).filter(Boolean).length,
    [essay]
  );
  const target = wordCountTarget[level];
  const wordStatus =
    wordCount === 0 ? "idle"
    : wordCount < target.min ? "low"
    : wordCount > target.max ? "high"
    : "good";

  const handleSubmit = useCallback(() => {
    if (essay.trim().length < 20) return;
    onFeedbackChange("reviewing");
  }, [essay, onFeedbackChange]);

  const handleReset = useCallback(() => {
    onFeedbackChange("idle");
    setEssay("");
  }, [onFeedbackChange]);

  // Feedback view
  if (feedbackState === "reviewing") {
    return (
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-6">
        <WritingFeedback
          essay={essay}
          level={level}
          topic={selectedTopic?.title || ""}
          onRewrite={() => onFeedbackChange("idle")}
          onNewTask={handleReset}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-0 max-w-6xl mx-auto w-full">
      {/* Left: Task Panel */}
      <div className="flex-1 border-r border-[var(--border)] bg-[var(--card)] flex flex-col min-h-0">
        <div className="p-5 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Pencil size={16} className="text-[var(--accent)]" />
            <span className="text-xs font-medium text-[var(--accent)] uppercase tracking-wider">Writing Task</span>
          </div>
          <h2 className="text-lg font-semibold mt-1" style={{ fontFamily: "var(--font-display)" }}>
            {selectedTopic ? selectedTopic.title : "选择一个题目开始写作"}
          </h2>
          {selectedTopic && (
            <div className="flex items-center gap-2 mt-2 text-xs text-[var(--muted-foreground)]">
              <span className="px-2 py-0.5 rounded-full bg-[var(--secondary)]">{selectedTopic.type}</span>
              <span>难度：{selectedTopic.difficulty}</span>
              <span>·</span>
              <span>{target.min}–{target.max} 词</span>
            </div>
          )}
        </div>

        {!selectedTopic && (
          <div className="px-5 pb-5 flex-1 overflow-auto">
            <p className="text-xs text-[var(--muted-foreground)] mb-3">根据近年主题趋势，以下是AI生成的原创训练题：</p>
            {loadingTopics ? (
              <div className="flex flex-col items-center gap-2 text-sm text-[var(--muted-foreground)] py-8 justify-center">
                <Loader2 size={16} className="animate-spin" />
                <span>AI 正在生成题目...</span>
                <div className="max-w-sm w-full"><StreamText /></div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic)}
                    className="w-full text-left p-4 rounded-xl border border-[var(--border)] hover:border-[var(--ring)]/50 hover:bg-[var(--secondary)]/50 transition-all duration-200 cursor-pointer group"
                  >
                    <p className="text-sm font-medium group-hover:text-[var(--accent)] transition-colors">{topic.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--muted-foreground)]">
                      <span>{topic.type}</span><span>·</span><span>{topic.difficulty}</span><span>·</span><span>{topic.focus}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] text-[var(--muted-foreground)] mt-4 text-center">以下为原创 CET-style 仿真模拟训练</p>
          </div>
        )}

        {selectedTopic && (
          <div className="px-5 pb-4">
            <div className="rounded-xl bg-[var(--secondary)]/60 p-4">
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                请在右侧编辑器中完成作文。建议词数 <strong className="text-[var(--foreground)]">{target.min}–{target.max} 词</strong>。提交后AI将从内容、结构、语法、词汇、句式、自然度等八个维度评分。
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Editor */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-5 py-3 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--muted-foreground)]">词数</span>
            <span className={cn("text-sm font-mono font-medium tabular-nums",
              wordStatus === "low" && "text-[var(--error)]",
              wordStatus === "high" && "text-[var(--accent)]",
              wordStatus === "good" && "text-[var(--success)]"
            )}>{wordCount}</span>
            <span className="text-xs text-[var(--muted-foreground)]">/ {target.min}–{target.max}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEssay("")} disabled={essay.length === 0}>
              <RefreshCw size={14} /> 清空
            </Button>
            <Button size="sm" variant="accent" onClick={handleSubmit} disabled={essay.trim().length < 20} className="gap-1.5">
              <Send size={14} />
              提交批改
            </Button>
          </div>
        </div>

        <textarea
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
          placeholder={selectedTopic ? "在此输入你的作文...\n\n提示：先列出要点再展开，注意段落结构。" : "请先在左侧选择一个题目"}
          disabled={!selectedTopic}
          className="flex-1 w-full resize-none p-5 text-sm leading-relaxed bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:outline-none disabled:opacity-50"
          style={{ fontFamily: "var(--font-body)" }}
        />
      </div>
    </div>
  );
}

// ─── Feedback View ──────────────────────────────────────────

function WritingFeedback({ essay, level, topic, onRewrite, onNewTask }: {
  essay: string; level: CETLevel; topic: string;
  onRewrite: () => void; onNewTask: () => void;
}) {
  const [tab, setTab] = useState("overview");
  const [feedback, setFeedback] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let fullText = "";
    const wc = essay.trim().split(/\s+/).filter(Boolean).length;
    const tgt = wordCountTarget[level];
    setLoading(true);
    chatStream(
      { mode: "writing", action: "feedback", userInput: essay, context: { level, topic, targetWords: `${tgt.min}–${tgt.max}`, actualWords: String(wc) } },
      () => {},
      (text) => {
        if (cancelled) return;
        fullText = text;
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            setFeedback(JSON.parse(match[0]));
            setLoading(false);
          } catch { /* wait for more tokens */ }
        }
      },
      (err) => { if (!cancelled) { setError(err.message); setLoading(false); } }
    );
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 size={28} className="animate-spin text-[var(--accent)]" />
        <p className="text-sm text-[var(--muted-foreground)]">AI 正在批改你的作文...</p>
        <div className="max-w-md w-full"><StreamText /></div>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-[var(--error)]">{error || "批改失败，请重试"}</p>
        <Button variant="ghost" onClick={onNewTask} className="mt-3">返回</Button>
      </div>
    );
  }

  const f = feedback as Record<string, unknown>;
  const breakdown = f.breakdown as Record<string, number> | undefined;
  const strengths = f.strengths as string[] | undefined;
  const problems = f.problems as string[] | undefined;
  const edits = f.sentenceEdits as Array<{ original: string; revised: string; note: string }> | undefined;
  const expressions = f.expressions as string[] | undefined;
  const wordCount = essay.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fade-up">
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">AI估分结果</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{f.score as number}</span>
              <span className="text-sm text-[var(--muted-foreground)]">/ 15</span>
              <span className="px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-medium">{f.level as string}</span>
            </div>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">{wordCount} 词 · {level}</span>
        </div>
      </Card>

      <Tabs value={tab} onChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">总览</TabsTrigger>
          <TabsTrigger value="edits">逐句修改</TabsTrigger>
          <TabsTrigger value="upgrade">高分改写</TabsTrigger>
          <TabsTrigger value="template">模板</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "overview" && (
        <div className="space-y-5">
          <Card>
            <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>分项评分</h3>
            <div className="space-y-3">
              {breakdown && Object.entries(breakdown).map(([key, score]) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-[var(--muted-foreground)]">{breakdownLabels[key] || key}</div>
                  <Progress value={score} className="flex-1" />
                  <span className={cn("w-10 text-right text-xs font-mono font-medium",
                    score >= 18 ? "text-[var(--success)]" : score >= 12 ? "text-[var(--accent)]" : "text-[var(--error)]"
                  )}>{score}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center gap-2 mb-3"><CheckCircle2 size={16} className="text-[var(--success)]" /><h3 className="text-sm font-semibold">主要优点</h3></div>
              <ul className="text-xs text-[var(--muted-foreground)] space-y-2">
                {strengths?.map((s, i) => <li key={i} className="flex gap-2"><span className="text-[var(--success)] mt-0.5">+</span>{s}</li>)}
              </ul>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-3"><AlertCircle size={16} className="text-[var(--error)]" /><h3 className="text-sm font-semibold">主要问题</h3></div>
              <ul className="text-xs text-[var(--muted-foreground)] space-y-2">
                {problems?.map((p, i) => <li key={i} className="flex gap-2"><span className="text-[var(--error)] mt-0.5">-</span>{p}</li>)}
              </ul>
            </Card>
          </div>
        </div>
      )}

      {tab === "edits" && (
        <Card>
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>逐句修改</h3>
          <div className="space-y-4">
            {edits?.map((edit, i) => (
              <div key={i} className="p-4 rounded-xl bg-[var(--secondary)]/50 space-y-2">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--error)] font-medium">原文</span>
                  <p className="text-sm text-[var(--foreground)]/80 line-through mt-0.5">{edit.original}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--success)] font-medium">修改</span>
                  <p className="text-sm text-[var(--foreground)] mt-0.5">{edit.revised}</p>
                </div>
                <p className="text-xs text-[var(--muted-foreground)] pt-1 border-t border-[var(--border)]">
                  <Lightbulb size={12} className="inline mr-1 text-[var(--accent)]" />{edit.note}
                </p>
              </div>
            )) || <p className="text-xs text-[var(--muted-foreground)]">AI 未生成逐句修改，可查看总览评估。</p>}
          </div>
        </Card>
      )}

      {tab === "upgrade" && (
        <Card>
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>高分改写版</h3>
          <div className="p-4 rounded-xl bg-[var(--secondary)]/60">
            <p className="text-sm leading-relaxed">{f.rewritten as string || "暂无改写版本"}</p>
          </div>
          {expressions && expressions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold mb-2 text-[var(--muted-foreground)]">可复用表达</h4>
              <div className="flex flex-wrap gap-2">
                {expressions.map((expr) => (
                  <span key={expr} className="px-2.5 py-1 rounded-lg bg-[var(--accent)]/8 text-[var(--accent)] text-xs cursor-pointer hover:bg-[var(--accent)]/15 transition-colors">{expr}</span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {tab === "template" && (
        <Card>
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>个性化模板</h3>
          <div className="p-4 rounded-xl bg-[var(--secondary)]/50">
            <p className="text-xs leading-relaxed text-[var(--foreground)] whitespace-pre-wrap font-mono">{f.template as string || "暂无模板"}</p>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" onClick={onNewTask} className="gap-1.5"><RefreshCw size={14} />再来一题</Button>
        <Button variant="ghost" onClick={onRewrite}>重写这版</Button>
        <Button
          variant="ghost"
          onClick={() => {
            addEntry({
              mode: "writing",
              level,
              task: { topic, essay },
              userAnswer: essay,
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

const breakdownLabels: Record<string, string> = {
  contentRelevance: "内容切题度", organization: "结构完整度", coherence: "逻辑连贯性",
  grammar: "语法准确性", vocabulary: "词汇丰富度", sentenceVariety: "句式多样性",
  naturalness: "语言自然度", templateOveruse: "模板痕迹",
};
