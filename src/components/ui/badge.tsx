import type { ReactNode } from "react";

type Variant = "default" | "primary" | "success" | "warning" | "danger" | "neutral";

const variants: Record<Variant, string> = {
  default: "bg-muted text-foreground",
  primary: "bg-primary-soft text-primary-soft-foreground",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  warning: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  neutral: "bg-muted text-muted-foreground",
};

export function Badge({
  variant = "default",
  className = "",
  children,
}: {
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

const SENTIMENT_LABELS: Record<string, string> = {
  very_negative: "Very negative",
  negative: "Negative",
  neutral: "Neutral",
  positive: "Positive",
  very_positive: "Very positive",
};

const SENTIMENT_DOT: Record<string, string> = {
  very_negative: "bg-sentiment-very-negative",
  negative: "bg-sentiment-negative",
  neutral: "bg-sentiment-neutral",
  positive: "bg-sentiment-positive",
  very_positive: "bg-sentiment-very-positive",
};

const SENTIMENT_BG: Record<string, string> = {
  very_negative: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  negative: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  neutral: "bg-muted text-muted-foreground",
  positive: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  very_positive: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200",
};

export function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) {
    return <Badge variant="neutral">Unanalyzed</Badge>;
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        SENTIMENT_BG[sentiment] ?? SENTIMENT_BG.neutral
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${SENTIMENT_DOT[sentiment] ?? SENTIMENT_DOT.neutral}`} />
      {SENTIMENT_LABELS[sentiment] ?? sentiment}
    </span>
  );
}

const TREND_ICON: Record<string, ReactNode> = {
  rising: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
      <path d="M8 2.5a.75.75 0 01.75.75v7.69l2.72-2.72a.75.75 0 111.06 1.06l-4 4a.75.75 0 01-1.06 0l-4-4a.75.75 0 111.06-1.06l2.72 2.72V3.25A.75.75 0 018 2.5z" transform="rotate(180 8 8)" />
    </svg>
  ),
  falling: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
      <path d="M8 2.5a.75.75 0 01.75.75v7.69l2.72-2.72a.75.75 0 111.06 1.06l-4 4a.75.75 0 01-1.06 0l-4-4a.75.75 0 111.06-1.06l2.72 2.72V3.25A.75.75 0 018 2.5z" />
    </svg>
  ),
  flat: (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
      <path d="M3 8a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5A.75.75 0 013 8z" />
    </svg>
  ),
};

const TREND_LABEL: Record<string, string> = { rising: "Rising", falling: "Falling", flat: "Flat" };

const TREND_BG: Record<string, string> = {
  rising: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  falling: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  flat: "bg-muted text-muted-foreground",
};

export function TrendBadge({ direction }: { direction: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        TREND_BG[direction] ?? TREND_BG.flat
      }`}
    >
      {TREND_ICON[direction] ?? TREND_ICON.flat}
      {TREND_LABEL[direction] ?? direction}
    </span>
  );
}
