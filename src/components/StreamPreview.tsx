"use client";

import { useState, useEffect, useRef } from "react";
import { tokenEvents } from "@/lib/token-events";

/** Shows streaming AI output with low opacity in the header — reduces perceived wait time. */
export function StreamPreview() {
  const [text, setText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return tokenEvents.subscribe((s) => setText(s.text));
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  if (!text) return null;

  // Show last ~200 chars
  const preview = text.length > 200 ? "…" + text.slice(-200) : text;

  return (
    <div
      ref={containerRef}
      className="flex-1 mx-4 overflow-hidden"
      title="AI 正在生成内容..."
    >
      <p
        className="text-[11px] leading-relaxed whitespace-pre-wrap opacity-15 select-none line-clamp-1"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {preview}
      </p>
    </div>
  );
}
