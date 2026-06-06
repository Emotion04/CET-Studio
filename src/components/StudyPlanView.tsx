"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Calendar, Target, Clock, BookOpen, Pencil, Headphones, TrendingUp, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { StreamText } from "@/components/StreamText";
import { chatStream } from "@/lib/api";
import type { CETLevel } from "@/lib/types";

interface StudyPlanViewProps { level: CETLevel; }

export function StudyPlanView({ level }: StudyPlanViewProps) {
  const [plan, setPlan] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [phase, setPhase] = useState("weekly");

  const generatePlan = useCallback(() => {
    setGenerating(true);
    setPlan(null);
    chatStream(
      { mode: "study-plan", action: "plan", context: { level } },
      () => {},
      (text) => {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          try { setPlan(JSON.parse(match[0])); setLoading(false); setGenerating(false); } catch { /* wait */ }
        }
      },
      () => { setLoading(false); setGenerating(false); }
    );
  }, [level]);

  useEffect(() => {
    generatePlan();
  }, [generatePlan]);

  if (loading && !plan) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-[var(--accent)]" />
          <p className="text-sm text-[var(--muted-foreground)]">AI 正在制定个性化备考方案...</p>
          <div className="max-w-md w-full"><StreamText /></div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[var(--error)] mb-3">方案生成失败</p>
          <Button variant="primary" onClick={generatePlan} disabled={generating}>
            {generating ? <Loader2 size={14} className="animate-spin mr-1" /> : null}重新生成
          </Button>
        </div>
      </div>
    );
  }

  const p = plan as Record<string, unknown>;
  const dailyTasks = p.dailyTasks as Array<{ timeSlot: string; duration: string; task: string }> | undefined;
  const weeklyPriorities = p.weeklyPriorities as string[] | undefined;
  const checkpoints = p.mockTestCheckpoints as string[] | undefined;
  const risks = p.riskWarnings as string[] | undefined;

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-6 space-y-6 animate-fade-up">
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={16} className="text-[var(--accent)]" />
              <span className="text-xs font-medium text-[var(--accent)] uppercase tracking-wider">Study Plan</span>
            </div>
            <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>{level} 备考方案</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{p.diagnosticSummary as string}</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="text-center"><span className="text-[var(--muted-foreground)]">当前</span><div className="text-lg font-bold">{p.currentScore as number}</div></div>
            <TrendingUp size={16} className="text-[var(--accent)]" />
            <div className="text-center"><span className="text-[var(--muted-foreground)]">目标</span><div className="text-lg font-bold text-[var(--accent)]">{p.targetScore as number}</div></div>
          </div>
        </div>
      </Card>

      <Tabs value={phase} onChange={setPhase}>
        <TabsList>
          <TabsTrigger value="weekly">周计划</TabsTrigger>
          <TabsTrigger value="daily">每日任务</TabsTrigger>
          <TabsTrigger value="checkpoints">模考节点</TabsTrigger>
        </TabsList>
      </Tabs>

      {phase === "weekly" && (
        <div className="grid sm:grid-cols-2 gap-4">
          {(weeklyPriorities || []).map((item, i) => {
            const icons = [Pencil, BookOpen, Headphones, Target];
            const colors = ["#C8963E", "#5B7FA5", "#9B6B9E", "#C75B5B"];
            const Icon = icons[i % 4];
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="h-full">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: colors[i % 4] + "18" }}>
                      <Icon size={16} style={{ color: colors[i % 4] }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">第 {i + 1} 周重点</h4>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">{item}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {phase === "daily" && (
        <Card>
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>每日任务清单</h3>
          <div className="space-y-2">
            {(dailyTasks || []).map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--secondary)]/50 transition-colors">
                <div className="w-5 h-5 rounded-full border-2 border-[var(--border)] flex items-center justify-center shrink-0" />
                <span className="text-xs font-mono text-[var(--muted-foreground)] bg-[var(--secondary)] px-2 py-0.5 rounded w-16 text-center">{item.timeSlot}</span>
                <span className="text-xs text-[var(--muted-foreground)] bg-[var(--secondary)] px-2 py-0.5 rounded">{item.duration}</span>
                <span className="text-xs text-[var(--foreground)]">{item.task}</span>
              </div>
            )) || <p className="text-xs text-[var(--muted-foreground)]">没有每日任务数据</p>}
          </div>
        </Card>
      )}

      {phase === "checkpoints" && (
        <>
          <Card>
            <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>模考节点与阶段目标</h3>
            <div className="space-y-4">
              {(checkpoints || []).map((cp, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-16 shrink-0"><span className="text-xs font-semibold">第 {i + 1} 次</span></div>
                  <div className="flex-1 min-w-0">
                    <Progress value={i === 0 ? 100 : (5 - i) * 20} className="mb-1" />
                    <p className="text-xs text-[var(--muted-foreground)]">{cp}</p>
                  </div>
                </div>
              )) || <p className="text-xs text-[var(--muted-foreground)]">暂无模考数据</p>}
            </div>
          </Card>

          {risks && risks.length > 0 && (
            <Card className="border-[var(--accent)]/30 bg-[var(--accent)]/5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-[var(--accent)] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold">风险提示</h4>
                  <ul className="text-xs text-[var(--muted-foreground)] mt-1 space-y-1">
                    {risks.map((r, i) => <li key={i}>· {r}</li>)}
                  </ul>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      <div className="text-center text-xs text-[var(--muted-foreground)] pt-4 border-t border-[var(--border)]">
        AI 基于原创 CET-style 框架生成 · 重新打开将刷新方案
      </div>
    </div>
  );
}
