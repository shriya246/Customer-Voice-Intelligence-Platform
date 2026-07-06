# Executive Summary

Updated at the end of each sprint. This is the 60-second version of where VoiceIQ Enterprise stands.

---

## Current status — Sprint 3 complete

**What VoiceIQ is:** a platform that turns scattered customer feedback into a prioritized, evidence-based product opportunity map, instead of relying on whoever complained most recently or most loudest.

**Where we are:** the full loop is built end to end — feedback in (manual entry, CSV import, or the embeddable widget) → automatically embedded and clustered into AI-labeled themes → sentiment- and pain-point-tagged → scored by a RICE-based opportunity formula that's always traceable back to real feedback and always overridable by a PM → synthesized into data-backed personas → linked to a roadmap tracker with a real status lifecycle → narrated into an executive-ready summary of what customers are asking for and why it matters. Every one of those steps is demoable today, not just scaffolded.

This sprint also completed a hardening pass rather than shipping it as an afterthought: a full RLS audit across all 16 tenant tables (which caught and fixed a real cross-org data-integrity gap in two join tables — the kind of bug that's invisible until someone specifically goes looking for it), a rate-limit audit confirming the one public write surface is correctly protected, structured error logging across every AI call site, and a Vitest unit-test suite (34 tests) covering the RICE math, the trend-comparison logic, and the defensive parsing that holds the AI pipeline together — now wired into CI so a regression in any of that fails the build, not just a future demo.

**The caveat from last sprint is now closed:** Groq, Hugging Face, and Upstash are connected to live credentials, and the full pipeline has been re-verified end to end against real output — real feedback content correctly embedded, clustered into a labeled theme, sentiment-tagged with an extracted pain point, and (calling the remaining Groq features directly) real personas, competitor summaries, and executive narratives all grounded correctly in the data they were given. Upstash's rate limiting was confirmed live too — concurrent requests against the widget correctly return `429` past the configured threshold.

That live verification pass caught one real bug the credential-free period couldn't have: `summarizeCompetitorMentions` failed roughly 2 out of every 3 calls with a Groq-side JSON validation error, traced to an ambiguous prompt (it described a value's shape without ever showing the model a properly quoted example) that sometimes led the model to emit an unquoted string. Fixed by rewriting all five Groq prompts to show quoted placeholders explicitly, plus a shared retry helper as defense-in-depth — confirmed at 0 failures across 8 consecutive full verification runs (24 calls) after the fix. Full detail in `ARCHITECTURE.md`'s "Groq JSON reliability" section.

**Why the hardening pass mattered as much as any feature sprint:** the whole pitch — "an evidence-based opportunity map instead of anecdote-based prioritization" — only holds if the data underneath it is trustworthy at the tenant-isolation level, not just at the UI level. Finding and closing the cross-org RLS gap this sprint, before any real customer data exists, is exactly the kind of bug that's cheap to fix now and expensive to explain later. The same principle applies to the Groq JSON bug above: caught during a deliberate live-verification pass, not by a customer hitting a silent failure in production.

**Live and deployed:** Vercel is connected, the app is live in production, and the full pipeline was re-verified a third time against the actual deployment — not local dev, not an isolated API check. Real feedback submitted through the deployed widget endpoint came back correctly embedded, clustered into a labeled theme, and sentiment-tagged; concurrent load against the same live endpoint correctly triggered rate limiting past the configured threshold. Every external service this build depends on (Supabase, Groq, Hugging Face, Upstash, Vercel) is now connected, and every piece of the product — ingestion, clustering, scoring, personas, roadmap, competitive notes, executive narration — has been verified against real output in the real deployed environment.

**What's next:** begin the go-to-market motion described in [GTM_STRATEGY.md](./GTM_STRATEGY.md): a private beta with a handful of early-stage PM teams, feedback on the clustering/scoring quality itself, then a public self-serve launch against the free tier defined in [PRICING_STRATEGY.md](./PRICING_STRATEGY.md).

---

## Previous: Sprint 2 complete

**Where we were:** VoiceIQ became an intelligence platform, not just a feedback repository. Every piece of feedback got embedded and automatically clustered into a theme with related feedback, whether it arrived through manual entry, a CSV import, or the public widget. Each theme got an AI-generated name and summary, individual feedback got sentiment and pain-point tagging, and every theme carried a computed opportunity score (Reach × Impact × Confidence ÷ Effort) that was always traceable back to the real feedback behind it and always overridable by a PM who knows something the data doesn't. A trend view showed which themes were heating up or cooling off week over week.

**What changed since:** Sprint 3 added personas, roadmap integration, competitive notes, the executive summary generator, and the hardening pass described above — see the current status section for the full picture.
