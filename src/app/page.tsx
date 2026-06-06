"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Languages,
  BookOpen,
  Headphones,
  Calendar,
  Bookmark,
  ArrowRight,
  Sparkles,
  BookmarkCheck,
} from "lucide-react";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TokenBadge } from "@/components/TokenBadge";
import { TotalTokenBadge } from "@/components/TotalTokenBadge";
import type { CETLevel, SectionMode } from "@/lib/types";

// Preload on hover — browser caches the chunk, instant when clicking through
const preloaded = new Set<string>();
function preloadView(id: SectionMode) {
  if (preloaded.has(id)) return;
  preloaded.add(id);
  switch (id) {
    case "writing": import("@/components/WritingView"); break;
    case "translation": import("@/components/TranslationView"); break;
    case "reading": import("@/components/ReadingView"); break;
    case "listening": import("@/components/ListeningView"); break;
    case "study-plan": import("@/components/StudyPlanView"); break;
  }
}

const sections: Array<{
  id: SectionMode;
  label: string;
  enLabel: string;
  icon: typeof Pencil;
  description: string;
  color: string;
}> = [
  {
    id: "writing",
    label: "写作",
    enLabel: "Writing",
    icon: Pencil,
    description: "原创命题 · 分项评分 · 逐句修改 · 模板生成",
    color: "#C8963E",
  },
  {
    id: "translation",
    label: "翻译",
    enLabel: "Translation",
    icon: Languages,
    description: "中文段落 · 英译批改 · 中式英语诊断 · 高分对照",
    color: "#6B8F71",
  },
  {
    id: "reading",
    label: "阅读",
    enLabel: "Reading",
    icon: BookOpen,
    description: "选词填空 · 长篇匹配 · 仔细阅读 · 干扰项分析",
    color: "#5B7FA5",
  },
  {
    id: "listening",
    label: "听力",
    enLabel: "Listening",
    icon: Headphones,
    description: "原创脚本 · 场景模拟 · 线索定位 · 错因诊断",
    color: "#9B6B9E",
  },
  {
    id: "study-plan",
    label: "学习规划",
    enLabel: "Study Plan",
    icon: Calendar,
    description: "目标分析 · 周计划 · 每日任务 · 模考节点",
    color: "#C75B5B",
  },
];

const levelInfo = {
  "CET-4": {
    writing: "120–180 词",
    description:
      "校园生活 · 学习方法 · 数字习惯 · 个人成长 · 社会观察",
    vocab: "约 4,500 词",
  },
  "CET-6": {
    writing: "150–220 词",
    description:
      "科技与社会 · 教育 · 职业发展 · 文化沟通 · 可持续发展",
    vocab: "约 6,000 词",
  },
};

export default function Home() {
  const router = useRouter();
  const [level, setLevel] = useState<CETLevel>("CET-4");
  const [selectedSection, setSelectedSection] = useState<SectionMode | null>(null);
  const [hoveredSection, setHoveredSection] = useState<SectionMode | null>(null);

  const handleStart = useCallback(() => {
    if (!selectedSection) return;
    const params = new URLSearchParams({ level, mode: selectedSection });
    router.push(`/practice?${params.toString()}`);
  }, [selectedSection, level, router]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <Bookmark size={16} className="text-[var(--primary-foreground)]" />
            </div>
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              CET Studio
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <Sparkles size={14} />
            <span className="hidden lg:inline">原创 CET-style 仿真模拟训练</span>
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

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <div className="mx-auto max-w-3xl w-full px-6 pt-20 pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1
              className="text-5xl font-bold tracking-tight mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              用对方法，每分进步都看得见
            </h1>
            <p className="text-lg text-[var(--muted-foreground)] max-w-xl mx-auto leading-relaxed">
              基于 2015–2025 年真题趋势分析，提供原创仿真训练、诊断性反馈和个性化提升方案
            </p>
          </motion.div>
        </div>

        {/* Level Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-auto max-w-sm w-full px-6 mb-10"
        >
          <div className="flex rounded-2xl bg-[var(--secondary)] p-1.5">
            {(["CET-4", "CET-6"] as CETLevel[]).map((l) => (
              <button
                key={l}
                onClick={() => {
                  setLevel(l);
                  setSelectedSection(null);
                }}
                className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 cursor-pointer ${
                  level === l
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-[var(--muted-foreground)] mt-3 px-4 leading-relaxed">
            {levelInfo[level].description}
          </p>
        </motion.div>

        {/* Section Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mx-auto max-w-4xl w-full px-6 mb-12"
        >
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {sections.map((section, i) => {
              const Icon = section.icon;
              const isSelected = selectedSection === section.id;
              const isHovered = hoveredSection === section.id;

              return (
                <motion.button
                  key={section.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  onClick={() =>
                    setSelectedSection(
                      isSelected ? null : section.id
                    )
                  }
                  onMouseEnter={() => { setHoveredSection(section.id); preloadView(section.id); }}
                  onMouseLeave={() => setHoveredSection(null)}
                  className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-300 cursor-pointer text-center ${
                    isSelected
                      ? "border-[var(--ring)] bg-[var(--card)] shadow-lg scale-[1.02]"
                      : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--ring)]/40 hover:shadow-md"
                  }`}
                >
                  {/* Icon circle */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isSelected || isHovered
                        ? "scale-110"
                        : ""
                    }`}
                    style={{
                      backgroundColor:
                        isSelected || isHovered
                          ? section.color + "18"
                          : "var(--secondary)",
                    }}
                  >
                    <Icon
                      size={22}
                      style={{
                        color:
                          isSelected || isHovered
                            ? section.color
                            : "var(--muted-foreground)",
                      }}
                    />
                  </div>

                  <div>
                    <div className="text-sm font-semibold mb-0.5" style={{ fontFamily: "var(--font-display)" }}>
                      {section.label}
                    </div>
                    <div className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider">
                      {section.enLabel}
                    </div>
                  </div>

                  {/* Check indicator */}
                  {isSelected && (
                    <motion.div
                      layoutId="selected-indicator"
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center"
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Start Button */}
        <AnimatePresence>
          {selectedSection && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="mx-auto mb-20 text-center"
            >
              <div className="flex items-center gap-3 mb-4 text-sm text-[var(--muted-foreground)]">
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--secondary)] text-xs font-medium">
                  {level}
                </span>
                <span>
                  {sections.find((s) => s.id === selectedSection)?.label}
                </span>
                <span>·</span>
                <span>{levelInfo[level].writing}</span>
              </div>
              <Button
                size="lg"
                variant="accent"
                onClick={handleStart}
                className="gap-2 text-base px-10 py-4 rounded-2xl"
              >
                开始练习
                <ArrowRight size={18} />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--muted-foreground)]">
        以下练习均为原创 CET-style 仿真模拟，非官方真题再现
      </footer>
    </div>
  );
}
