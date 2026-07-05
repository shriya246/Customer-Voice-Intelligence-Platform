-- Nullable, filled in best-effort by the Groq sentiment call alongside
-- embedding/clustering -- same "never block ingestion" posture as embedding.
alter table public.feedback_items add column sentiment text
  check (sentiment in ('very_negative', 'negative', 'neutral', 'positive', 'very_positive'));
alter table public.feedback_items add column sentiment_score float8;
alter table public.feedback_items add column pain_point text;
