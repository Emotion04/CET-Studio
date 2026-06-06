"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { tokenEvents } from "@/lib/token-events";

export function TokenBadge() {
  const [tokens, setTokens] = useState(0);

  useEffect(() => {
    return tokenEvents.subscribe((s) => setTokens(s.tokens));
  }, []);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--secondary)] text-[10px] tabular-nums text-[var(--muted-foreground)] shrink-0 ${tokens === 0 ? "invisible" : ""}`}>
      <Sparkles size={10} className="text-[var(--accent)]" />
      <span className="font-mono font-medium min-w-[4ch] text-right">{tokens}</span>
      <span>tokens</span>
    </span>
  );
}
