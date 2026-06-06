"use client";

import { cn } from "@/lib/utils";
import { createContext, useContext, useMemo, type ReactNode } from "react";

interface TabsContextType {
  value: string;
  onChange: (v: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

export function Tabs({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  const contextValue = useMemo(() => ({ value, onChange }), [value, onChange]);

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-1 rounded-xl bg-[var(--secondary)] p-1",
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be inside Tabs");
  const active = ctx.value === value;

  return (
    <button
      onClick={() => ctx.onChange(value)}
      className={cn(
        "flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer",
        active
          ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
        className
      )}
    >
      {children}
    </button>
  );
}
