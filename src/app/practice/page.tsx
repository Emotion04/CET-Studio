"use client";

import { Suspense, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Bookmark, BookmarkCheck, Clock, Loader2 } from "lucide-react";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TokenBadge } from "@/components/TokenBadge";
import { TotalTokenBadge } from "@/components/TotalTokenBadge";
import type { CETLevel, SectionMode, FeedbackState } from "@/lib/types";

// Code-split: each view is only loaded when its mode is selected.
// Reduces initial JS bundle ~60% (WritingView alone pulls in framer-motion + all lucide icons).
const WritingView = dynamic(() => import("@/components/WritingView").then((m) => ({ default: m.WritingView })), {
  loading: () => <ViewSkeleton />,
});

const TranslationView = dynamic(() => import("@/components/TranslationView").then((m) => ({ default: m.TranslationView })), {
  loading: () => <ViewSkeleton />,
});

const ReadingView = dynamic(() => import("@/components/ReadingView").then((m) => ({ default: m.ReadingView })), {
  loading: () => <ViewSkeleton />,
});

const ListeningView = dynamic(() => import("@/components/ListeningView").then((m) => ({ default: m.ListeningView })), {
  loading: () => <ViewSkeleton />,
});

const StudyPlanView = dynamic(() => import("@/components/StudyPlanView").then((m) => ({ default: m.StudyPlanView })), {
  loading: () => <ViewSkeleton />,
});

function ViewSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Loader2 size={16} className="animate-spin" />
        加载中...
      </div>
    </div>
  );
}

const modeLabels: Record<SectionMode, string> = {
  writing: "写作",
  translation: "翻译",
  reading: "阅读",
  listening: "听力",
  "study-plan": "学习规划",
};

function PracticeContent() {
  const params = useSearchParams();
  const level = (params.get("level") || "CET-4") as CETLevel;
  const mode = (params.get("mode") || "writing") as SectionMode;
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("idle");

  const handleFeedbackChange = useCallback((state: FeedbackState) => {
    setFeedbackState(state);
  }, []);

  const renderView = () => {
    switch (mode) {
      case "writing":
        return <WritingView level={level} feedbackState={feedbackState} onFeedbackChange={handleFeedbackChange} />;
      case "translation":
        return <TranslationView level={level} feedbackState={feedbackState} onFeedbackChange={handleFeedbackChange} />;
      case "reading":
        return <ReadingView level={level} feedbackState={feedbackState} onFeedbackChange={handleFeedbackChange} />;
      case "listening":
        return <ListeningView level={level} feedbackState={feedbackState} onFeedbackChange={handleFeedbackChange} />;
      case "study-plan":
        return <StudyPlanView level={level} />;
      default:
        return null;
    }
  };

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
              <Bookmark size={16} className="text-[var(--accent)]" />
              <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                {level} · {modeLabels[mode]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <Clock size={14} />
            <span className="hidden sm:inline">练习中</span>
            <TotalTokenBadge />
            <TokenBadge />
            <ApiKeyInput />
            <Link href="/error-book" title="错题本" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors shrink-0">
              <BookmarkCheck size={15} />
            </Link>
            <ThemeToggle />
            <a
              href="https://github.com/Emotion04/CET-Studio"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      <motion.main
        key={`${level}-${mode}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex flex-col"
      >
        {renderView()}
      </motion.main>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-sm text-[var(--muted-foreground)] animate-pulse-soft">加载中...</div>
        </div>
      }
    >
      <PracticeContent />
    </Suspense>
  );
}
