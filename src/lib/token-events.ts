// Pub/sub event bus for token counting + text streaming.
// Uses rAF batching — subscribers re-render at most ~60 fps.

type Listener = (state: { tokens: number; text: string }) => void;
type CompleteListener = (sessionTokens: number) => void;

const listeners = new Set<Listener>();
const completeListeners = new Set<CompleteListener>();

let tokens = 0;
let text = "";
let pendingTokens = 0;
let pendingText = "";
let rafScheduled = false;

function flush() {
  rafScheduled = false;
  tokens += pendingTokens;
  text += pendingText;
  pendingTokens = 0;
  pendingText = "";
  for (const fn of listeners) fn({ tokens, text });
}

// ─── Total tokens (persisted across sessions) ──────────────

const TOTAL_KEY = "cet-studio-total-tokens";

export function getTotalTokens(): number {
  if (typeof window === "undefined") return 0;
  try { return parseInt(localStorage.getItem(TOTAL_KEY) || "0", 10) || 0; } catch { return 0; }
}

function addToTotal(n: number) {
  if (typeof window === "undefined") return;
  const prev = getTotalTokens();
  localStorage.setItem(TOTAL_KEY, String(prev + n));
}

export const tokenEvents = {
  add(t: number, chunk: string) {
    pendingTokens += t;
    pendingText += chunk;
    if (!rafScheduled) {
      rafScheduled = true;
      requestAnimationFrame(flush);
    }
  },

  reset() {
    tokens = 0;
    text = "";
    pendingTokens = 0;
    pendingText = "";
    rafScheduled = false;
    for (const fn of listeners) fn({ tokens: 0, text: "" });
  },

  /** Call when stream finishes — notifies complete listeners */
  finalize() {
    if (rafScheduled) {
      cancelAnimationFrame(0); // rAF scheduled; just flush now
      flush();
    }
    const final = tokens;
    addToTotal(final);
    for (const fn of completeListeners) fn(final);
  },

  /** Returns current session token count without subscribing */
  getSessionTokens() {
    return tokens;
  },

  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },

  onComplete(fn: CompleteListener) {
    completeListeners.add(fn);
    return () => { completeListeners.delete(fn); };
  },
};
