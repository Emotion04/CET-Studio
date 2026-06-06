"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface Props {
  left: React.ReactNode;
  right: React.ReactNode;
  defaultRatio?: number; // 0–1, default 0.4 (40% left)
  minLeft?: number; // px
  minRight?: number; // px
}

export function ResizableSplit({ left, right, defaultRatio = 0.4, minLeft = 240, minRight = 280 }: Props) {
  const [ratio, setRatio] = useState(defaultRatio);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const r = Math.max(minLeft / rect.width, Math.min(1 - minRight / rect.width, x / rect.width));
      setRatio(r);
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [minLeft, minRight]);

  return (
    <div ref={containerRef} className="flex flex-col lg:flex-row gap-0 min-h-0">
      <div style={{ width: `calc(${ratio * 100}% - 4px)` }} className="shrink-0">
        {left}
      </div>
      <div
        onMouseDown={onMouseDown}
        className="hidden lg:flex w-2 cursor-col-resize shrink-0 bg-[var(--border)] hover:bg-[var(--accent)] transition-colors rounded-full my-4 items-center justify-center group"
        title="拖动调整宽度"
      >
        <div className="w-1 h-8 rounded-full bg-[var(--muted-foreground)]/30 group-hover:bg-[var(--accent)]/60 transition-colors" />
      </div>
      <div className="flex-1 min-w-0 mt-4 lg:mt-0">
        {right}
      </div>
    </div>
  );
}
