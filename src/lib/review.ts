import 'server-only';
import type { Step } from '@/data/roadmap';
import type { Review } from './grade';

const OR_MODEL = process.env.REVIEW_MODEL || 'anthropic/claude-sonnet-4.5';
const GEMINI_MODEL = process.env.GEMINI_REVIEW_MODEL || 'gemini-2.5-flash';

/* The reviewer walks the step's own done-when list item by item and must quote
   the person's words as its reason, so a rejection always says which condition
   failed in terms of what they actually wrote — and an off-topic essay or a
   confident non-answer cannot skate through on tone. */
function buildPrompt(step: Step, evidence: string) {
  return `You are checking whether a business owner has genuinely completed one step of Alex Hormozi's $100M Scaling Roadmap. Be fair but hard to fool.

THE STEP: ${step.title}
THE PROBLEM IT SOLVES: ${step.theProblem}
WHAT THEY WERE TOLD TO DO: ${step.whatToDo}

THE CONDITIONS. It only counts as done when ALL of these are true:
${step.doneWhen.map((d, i) => `${i + 1}. ${d}`).join('\n')}

THEY WERE ASKED: ${step.evidencePrompt}

THEY WROTE:
"""
${evidence.slice(0, 4000)}
"""

Judge each numbered condition SEPARATELY against what they wrote:
- met: true only if their text contains concrete support for that condition. For "why", QUOTE the words of theirs you relied on, or write "nothing in their answer covers this".
- If a condition names a quantity (a count, a number of days, "all", "every"), their stated numbers must actually satisfy it. 12 days does not meet 14 days.
- onTopic: false if the text, however detailed, is not about this step's subject.
- Accept messy, badly written, informal answers when the substance is there. Real numbers, names, tools, dates count. Do not demand more than the conditions ask. Do not invent extra requirements.
- Reject restatements of the instruction, intentions and future tense, and detail-free confidence.

Reply with JSON only, no markdown fence:
{"criteria":[{"n":1,"met":true,"why":"quoted words or what is absent"}, ...one per condition...],"onTopic":true,"note":"one plain sentence to the person, second person, no jargon, no em dashes"}`;
}

function parse(raw: string, step: Step): Review | null {
  const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
  if (!json) return null;
  try {
    const p = JSON.parse(json);
    const criteria: { n: number; met: boolean; why: string }[] = Array.isArray(p.criteria)
      ? p.criteria.map((c: { n?: number; met?: boolean; why?: string }, i: number) => ({
          n: Number(c.n ?? i + 1),
          met: c.met === true,
          why: String(c.why ?? ''),
        }))
      : [];

    // The verdict is derived here, not trusted from the model: every condition
    // met AND on topic, or it is not done. A malformed criteria list rejects.
    const complete = criteria.length === step.doneWhen.length;
    const onTopic = p.onTopic === true;
    const allMet = complete && criteria.every((c) => c.met);
    const verdict: Review['verdict'] = allMet && onTopic ? 'accept' : 'needs_work';

    const missing = !onTopic
      ? ['Your answer is not about this step. Answer the question it asks.']
      : criteria
          .filter((c) => !c.met)
          .slice(0, 5)
          .map((c) => {
            const cond = step.doneWhen[c.n - 1] ?? `condition ${c.n}`;
            return c.why && !/^nothing in/i.test(c.why) ? `${cond} (${c.why})` : cond;
          });

    return {
      verdict,
      missing,
      note: typeof p.note === 'string' ? p.note : '',
      by: 'ai',
    };
  } catch {
    return null;
  }
}

async function viaOpenRouter(prompt: string, step: Step): Promise<Review | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OR_MODEL, max_tokens: 900, temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null; // out of credits, rate limited, whatever: fall through
    const data = await res.json();
    return parse(data?.choices?.[0]?.message?.content ?? '', step);
  } catch {
    return null;
  }
}

async function viaGemini(prompt: string, step: Step, model = GEMINI_MODEL): Promise<Review | null> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            // 2.5 models think by default and the thinking is billed against
            // this budget, which silently starved the reply once already.
            // Non-thinking models reject the field, so it is conditional.
            ...(model.includes('2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
            maxOutputTokens: 1400,
            responseMimeType: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(25_000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
    return parse(text, step);
  } catch {
    return null;
  }
}

/**
 * Reads what the person wrote, condition by condition. Tries each provider in
 * turn so one empty account cannot silently switch the checking off. Returns
 * null only when every provider is unreachable; the caller decides what to say
 * about that, out loud.
 */
export async function reviewEvidence(step: Step, evidence: string): Promise<Review | null> {
  const prompt = buildPrompt(step, evidence);
  return (
    (await viaOpenRouter(prompt, step)) ??
    (await viaGemini(prompt, step)) ??
    // separate free-tier quota pool, so a burst that exhausts one model's
    // window does not take the whole reviewer down
    (await viaGemini(prompt, step, 'gemini-2.0-flash'))
  );
}
