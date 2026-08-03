# $100M Scaling Roadmap

Live: **https://the-100m-scaling-roadmap.vercel.app**

Acquisition.com publishes its $100M Scaling Roadmap as ten static PDFs. This turns them into a
working app: you answer five placement questions, land on your stage, and work one step at a time.
Nothing advances until the evidence you wrote holds up.

10 stages, 80 steps, 354 pass/fail conditions.

## The part worth reading

Grading runs in two layers, and the second one is the point.

**Layer 1, deterministic (`src/lib/grade.ts`).** Every `doneWhen` condition must be ticked and the
evidence box must survive a rules gate: an intent detector that rejects future-tense answers with no
specifics (`isHandWave`), and a gibberish floor that catches held-down keys and repeated words
(`isGibberish`). This layer runs with no model in the loop, so the app keeps working when the API
does not.

**Layer 2, model review (`src/lib/review.ts`).** The evidence goes to an LLM that judges each
condition separately and must quote the user's own words as its reason. The verdict is derived from
those per-condition answers in code, not read out of the model's reply, so a confident model cannot
hand itself a pass.

Tick every box and it still reads what you wrote. Given *"yeah I am planning to get around to doing
this soon"* it comes back: **"That reads like something you intend to do, not something you did."**

## Engineering notes

- **Provider fallback chain.** OpenRouter first, then Gemini 2.5 Flash, then Gemini 2.0 Flash. The
  last hop exists because 2.0 draws on a separate free-tier quota pool, so a burst that exhausts one
  model does not take grading down.
- **Token cost control.** Gemini 2.5 models think by default and bill the thinking against the
  output budget, which silently starved the reviewer's reply. Fixed with
  `thinkingConfig: { thinkingBudget: 0 }`, applied conditionally because non-thinking models reject
  the field.
- **Honest failure.** If every provider returns null the app says so and falls back to the rules
  gate. It never fabricates a verdict.
- **Test harness.** `scripts/test-grading.mjs` proves the deterministic gate against labeled cases
  with no model in the loop. `npm run check` runs it alongside build-time guards for content tokens
  and placement questions, and `npm run build` refuses to compile if those guards fail.

## Stack

Next.js (App Router) · TypeScript · Neon Postgres via `@neondatabase/serverless` · cookie sessions ·
Vercel

## Run it

```bash
cp .env.example .env.local   # fill in DATABASE_URL and one model key
npm install
npm run migrate              # creates an isolated `roadmap` schema
npm run dev
```

The roadmap content itself is Acquisition.com's. This is an independent build, not affiliated with
or endorsed by Acquisition.com or Alex Hormozi.
