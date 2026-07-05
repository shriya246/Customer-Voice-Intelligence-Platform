# VoiceIQ Enterprise

Customer feedback is scattered across support tickets, reviews, surveys, call notes, and sales conversations — which means the loudest voice, not the most common or highest-impact one, tends to win roadmap debates. VoiceIQ turns that scattered feedback into a continuously updated, prioritized product opportunity map, so prioritization is evidence-based instead of anecdote-based.

## What it does

- Ingests feedback from multiple channels (manual entry, CSV import, embeddable widget)
- Clusters feedback into themes using semantic embeddings
- Scores each theme by volume, sentiment, and business impact (RICE-based)
- Surfaces data-backed personas and an executive-ready narrative of what customers are asking for and why it matters

## Tech stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Hosting:** Vercel
- **Database / Auth:** Supabase (Postgres, Auth, Storage, Row-Level Security, pgvector)
- **AI:** Groq (Llama 3.3) for sentiment, summarization, and clustering labels
- **Caching / rate limiting:** Upstash Redis
- **Charts:** Recharts

See [ARCHITECTURE.md](./ARCHITECTURE.md) for schema and pipeline details, and [PRD.md](./PRD.md) for product scope.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your own service keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project docs

- [PROJECT_PLAN.md](./PROJECT_PLAN.md) — vision and sprint plan
- [PRD.md](./PRD.md) — product requirements
- [PERSONAS.md](./PERSONAS.md) — target users
- [COMPETITIVE_ANALYSIS.md](./COMPETITIVE_ANALYSIS.md) — market landscape
- [ROADMAP.md](./ROADMAP.md) — MVP → V1 → V2
- [BACKLOG.md](./BACKLOG.md) — current sprint backlog
- [ARCHITECTURE.md](./ARCHITECTURE.md) — schema, API, pipeline design

## License

Proprietary — all rights reserved.
