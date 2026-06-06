"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { subscribeToast } from "@/lib/toast";

interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  lowOpacity: boolean;
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const colors = {
  success: "border-[var(--success)] bg-[var(--success)]/10",
  error: "border-[var(--error)] bg-[var(--error)]/10",
  info: "border-[var(--accent)] bg-[var(--accent)]/10",
};

const iconColors = {
  success: "text-[var(--success)]",
  error: "text-[var(--error)]",
  info: "text-[var(--accent)]",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribeToast(setToasts);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, x: 20, scale: 0.95 }}
              animate={{ opacity: t.lowOpacity ? 0.38 : 1, y: 0, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-xl border shadow-lg text-xs ${colors[t.type]}`}
            >
              <Icon size={14} className={iconColors[t.type]} />
              <span className="text-[var(--foreground)]">{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
