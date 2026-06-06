# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

CET Studio — a CET (College English Test) Band 4/6 exam preparation app. Users select a level and section (writing, translation, reading, listening, study plan), get AI-generated practice tasks, submit answers, and receive diagnostic feedback. Built on Next.js 16 (App Router), React 19, Tailwind CSS 4, and the DeepSeek API.

### Design source

- `cet-skill/SKILL.md` — the original CET skill design document (reference only, not runtime)
- `src/lib/prompts.ts` — the authoritative runtime prompt implementation (modify this, not SKILL.md)
- `docs/cet-scoring-rubric.md` — combined official CET band descriptors + Skill distillation rubric

## Rules

- **Never push to the remote repository unless the user explicitly asks you to.** This includes `git push`, `git push --set-upstream`, and any other push variant. Committing locally is fine; pushing is not without explicit permission.
- **Animation is mandatory on all interactive UI.** Every state change — mount/unmount, open/close, tab switch, card appear/disappear, button hover/click, feedback reveal, error book operations — must have smooth transitions. Use `framer-motion` (`motion.div`, `AnimatePresence`, `layoutId`) and Tailwind `transition-*` classes. No instant jumps; prefer staggered children for lists and `layout` prop for size changes.
- **Data must be local-first.** All user data (API keys, model preferences, error book, practice history) stored in `localStorage`. No server database. Must work identically on Vercel preview deploys.

## Pending architecture decisions

- [ ] Merge generate + feedback into one AI call: AI outputs task + answerKey + pre-written analysis in generation step. Client-side instant grading via answerKey comparison. AI feedback only called on-demand for personalized error diagnosis on wrong answers. Currently using two separate AI calls (generate → user answers → feedback).

## Key commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm lint         # Run ESLint
```

## Architecture

### Rendering & code splitting

- Home page (`src/app/page.tsx`) selects CET level and practice mode, then navigates to `/practice?level=...&mode=...`.
- Practice page (`src/app/practice/page.tsx`) uses `next/dynamic` to code-split five view components. Each view is only loaded when its mode is selected.
- Views preload on hover via manual `import()` calls to warm the browser cache.
- All components are client components (`"use client"`).

### AI pipeline (four-layer stack)

1. **Prompts** (`src/lib/prompts.ts`) — System prompt templates per mode+action. Exports `buildSystemPrompt(mode, action, vars?)` which interpolates `{{variable}}` placeholders and prepends "Return ONLY valid JSON" instruction.
2. **Client API** (`src/lib/api.ts`) — `chatStream(params, onToken, onDone, onError)` calls `/api/chat`, streams SSE, accumulates text, calls callbacks. Also `chat()` for non-streaming.
3. **API route** (`src/app/api/chat/route.ts`) — Receives `{ mode, action, userInput, context, provider }`, builds the prompt, proxies to the selected provider's API with streaming. API key priority: `x-api-key` header > provider-specific env var.
4. **Key store** (`src/lib/api-key-store.ts`) — Browser-only localStorage wrapper. Supports three providers: DeepSeek (`deepseek-chat`), 小米 MiMo (`mimo-v2.5`), and 通义千问 (`qwen-plus`). Keys are sent from client components via the `x-api-key` header, with the active provider in the `x-provider` header.

### View component pattern

Each practice view follows the same rhythm:
1. `feedbackState === "idle"` → fetch a generated task via `chatStream({ mode, action: "generate" })`, let user compose answer.
2. User clicks submit → `onFeedbackChange("reviewing")`.
3. Feedback sub-component calls `chatStream({ mode, action: "feedback", userInput, context })`, renders result.

JSON is extracted from streaming SSE text via regex `/\{[\s\S]*\}/` and `JSON.parse`.

### Directory layout

```
src/
  app/
    page.tsx              # Home — level select + section cards
    layout.tsx            # Root layout (zh-CN, metadata)
    globals.css           # Tailwind 4 imports, CSS variables, fonts, animations
    practice/page.tsx     # Code-split router to individual views
    api/chat/route.ts     # DeepSeek proxy endpoint
  components/
    ui/                   # Button, Card, Progress, Tabs (Radix-based primitives)
    WritingView.tsx       # Writing practice + feedback
    TranslationView.tsx   # Translation practice + feedback
    ReadingView.tsx       # Reading practice (3 subtypes) + feedback
    ListeningView.tsx     # Listening practice + feedback
    StudyPlanView.tsx     # AI-generated study plan
    ApiKeyInput.tsx       # In-header API key widget
  lib/
    types.ts              # CETLevel, SectionMode, feedback interfaces
    prompts.ts            # All AI prompt templates + factory
    api.ts                # Client-side fetch helpers (stream + non-stream)
    api-key-store.ts      # localStorage API key persistence
    mock-data.ts          # Static fallback topics and passages
    utils.ts              # cn() — clsx + tailwind-merge
```

## Tailwind CSS 4 (breaking changes from v3)

This project uses the Tailwind CSS 4 syntax, not the classic v3 config:

- **No `tailwind.config.ts`** — configuration lives in `globals.css` via `@theme inline { ... }`.
- **Import**: `@import "tailwindcss"` (not `@tailwind base/components/utilities`).
- **PostCSS**: Only `"@tailwindcss/postcss": {}` is needed in `postcss.config.mjs`.
- **Custom colors**: Defined as CSS custom properties in `:root`, then registered in `@theme inline` block (e.g., `--color-accent: var(--accent)`). Components reference them as `bg-[var(--accent)]`.
- **Dark mode**: `@media (prefers-color-scheme: dark)` overrides the same CSS variables.

## DeepSeek API notes

- Endpoint: `https://api.deepseek.com/chat/completions`
- Model: `deepseek-chat`
- All prompts enforce: "Return ONLY valid JSON, no markdown fences, no extra text before or after the JSON object."
- Copyright protection rules are non-negotiable in every system prompt — never reproduce real CET exam content.
- API key is stored client-side in `localStorage` under `cet-studio-api-key`. The route also supports server-side `DEEPSEEK_API_KEY` in `.env.local`.
