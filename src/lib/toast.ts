type ToastType = "success" | "error" | "info";

interface ToastOptions {
  type: ToastType;
  message: string;
  duration?: number;
  lowOpacity?: boolean;
}

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  lowOpacity: boolean;
}

type Listener = (toasts: ToastItem[]) => void;
let listeners: Listener[] = [];
let toasts: ToastItem[] = [];

function notify() {
  for (const fn of listeners) fn([...toasts]);
}

export function showToast(type: ToastType, message: string): void;
export function showToast(opts: ToastOptions): void;
export function showToast(typeOrOpts: ToastType | ToastOptions, message?: string): void {
  const opts: ToastOptions =
    typeof typeOrOpts === "string"
      ? { type: typeOrOpts, message: message! }
      : typeOrOpts;

  const id = crypto.randomUUID();
  toasts = [...toasts, { id, type: opts.type, message: opts.message, lowOpacity: opts.lowOpacity ?? false }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, opts.duration ?? 3000);
}

export function subscribeToast(fn: Listener) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
