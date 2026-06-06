export type ModelProvider = "deepseek" | "mimo" | "qwen";

export type CETLevel = "CET-4" | "CET-6";

export type SectionMode =
  | "writing"
  | "translation"
  | "reading"
  | "listening"
  | "study-plan";

export type ReadingSubtype =
  | "banked-cloze"
  | "paragraph-matching"
  | "careful-reading";

export type FeedbackState = "idle" | "submitted" | "reviewing";

export type WritingTaskType =
  | "opinion"
  | "phenomenon"
  | "solution"
  | "letter"
  | "chart";

export interface WritingTopic {
  id: string;
  title: string;
  type: WritingTaskType;
  difficulty: "easy" | "medium" | "hard";
  focus: string;
}

export interface ScoreBreakdown {
  contentRelevance: number;
  organization: number;
  coherence: number;
  grammar: number;
  vocabulary: number;
  sentenceVariety: number;
  naturalness: number;
  templateOveruse: number;
}

export interface WritingFeedback {
  score: string;
  level: string;
  overall: string;
  breakdown: ScoreBreakdown;
  strengths: string[];
  problems: string[];
  sentenceEdits: Array<{ original: string; revised: string; note: string }>;
  rewritten: string;
  expressions: string[];
  template: string;
  rewriteTask: string;
}

export interface TranslationFeedback {
  completeness: string;
  errors: string[];
  chinglish: string[];
  structure: string;
  standard: string;
  highScore: string;
  expressions: string[];
  miniDrill: string;
}

export interface ReadingFeedback {
  answers: Record<string, string>;
  evidence: Record<string, string>;
  reasoning: Record<string, string>;
  distractors: Record<string, string>;
  errorDiagnosis: string[];
  nextDrill: string;
}

export interface PracticeSession {
  id: string;
  level: CETLevel;
  mode: SectionMode;
  readingSubtype?: ReadingSubtype;
  state: FeedbackState;
  createdAt: Date;
}
