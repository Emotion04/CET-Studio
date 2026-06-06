"use client";

import { useState, useEffect, useRef } from "react";
import { tokenEvents } from "@/lib/token-events";

/** Streaming text — shows AI output at low opacity while generating. */
export function StreamText() {
  const [text, setText] = useState("");
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    return tokenEvents.subscribe((s) => setText(s.text));
  }, []);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [text]);

  if (!text) return null;

  const preview = text.length > 600 ? "…" + text.slice(-600) : text;

  return (
    <p
      ref={ref}
      className="text-[11px] leading-relaxed select-none max-h-48 overflow-hidden whitespace-pre-wrap break-all"
      style={{ fontFamily: "var(--font-mono)", opacity: "var(--stream-opacity)" }}
    >
      {preview}
    </p>
  );
}
