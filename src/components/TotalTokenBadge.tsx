"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { tokenEvents, getTotalTokens } from "@/lib/token-events";

export function TotalTokenBadge() {
  const [total, setTotal] = useState(0);
  const [plusTokens, setPlusTokens] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setTotal(getTotalTokens());
    return tokenEvents.onComplete((sessionTokens) => {
      if (sessionTokens <= 0) return;
      // Show green "+" badge
      setPlusTokens(sessionTokens);
      // After 1s, add to total
      timeoutRef.current = setTimeout(() => {
        setPlusTokens(null);
        setTotal(getTotalTokens());
      }, 1000);
    });
  }, []);

  useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--secondary)] text-[10px] tabular-nums text-[var(--muted-foreground)] shrink-0">
      <span className="font-mono font-medium min-w-[4ch] text-right">{total.toLocaleString()}</span>
      <span>total</span>
      {plusTokens !== null && (
        <span className="inline-flex items-center text-[var(--success)] animate-bounce-in ml-0.5">
          +{plusTokens}
        </span>
      )}
    </span>
  );
}
