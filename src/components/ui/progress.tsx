import { cn } from "@/lib/utils";

export function Progress({
  value,
  className,
  indicatorClassName,
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
}) {
  return (
    <div
      className={cn(
        "h-2 w-full rounded-full bg-[var(--secondary)] overflow-hidden",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500 ease-out",
          value >= 80
            ? "bg-[var(--success)]"
            : value >= 50
              ? "bg-[var(--accent)]"
              : "bg-[var(--error)]",
          indicatorClassName
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
