import { stageOf, type Step } from '@/data/roadmap';

export type ProgressRow = {
  stepId: string;
  stage: number;
  checked: number[];
  evidence: string;
  status: 'in_progress' | 'done';
  review: Review | null;
};

export type Review = {
  verdict: 'accept' | 'needs_work';
  missing: string[];
  note: string;
  by: 'rules' | 'ai';
};

export type StepVerdict = {
  done: boolean;
  missingChecks: string[];
  evidenceProblem: string | null;
};

const MIN_EVIDENCE = 25;

/**
 * The deterministic gate. Every doneWhen must be ticked and the evidence box
 * must hold a real answer. An AI pass can add nuance on top, but it can never
 * let someone through this.
 */
export function gradeStep(step: Step, checked: number[], evidence: string): StepVerdict {
  const set = new Set(checked);
  const missingChecks = step.doneWhen.filter((_, i) => !set.has(i));

  const text = evidence.trim();
  let evidenceProblem: string | null = null;
  if (!text) {
    evidenceProblem = 'Answer the question in the box so there is a record of what you actually did.';
  } else if (text.length < MIN_EVIDENCE) {
    evidenceProblem = 'That answer is too short to be a record. Give the specifics the question asks for.';
  } else if (normalise(text) === normalise(step.evidencePrompt)) {
    evidenceProblem = 'That is the question, not your answer.';
  } else if (isGibberish(text)) {
    evidenceProblem = 'That does not read as an answer. Write what you actually did, in real sentences.';
  } else if (isHandWave(text)) {
    evidenceProblem =
      'That reads like something you intend to do, not something you did. Put the actual numbers, names, tools or dates in.';
  }

  return { done: missingChecks.length === 0 && !evidenceProblem, missingChecks, evidenceProblem };
}

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const INTENT =
  /\b(i(?:'| a)?m going to|i will|i'll|we will|we'll|plan(?:ning)? to|about to|intend to|need to|have to|should|want to|hope to|will be|going to get|get around to|not yet|haven'?t|has ?n'?t|soon|next week|next month|eventually|todo|to do)\b/i;

/** Something concrete: a number, money, a percentage, or a name used mid sentence. */
function hasSpecifics(text: string) {
  if (/\d/.test(text)) return true;
  if (/[$%]/.test(text)) return true;
  // a capitalised word that is not the first word of a sentence, i.e. a real name
  return /[a-z,]\s+[A-Z][a-zA-Z]{2,}/.test(text);
}

/**
 * Catches the pure statement of intent with nothing concrete in it. Deliberately
 * narrow: it fires only when the text is BOTH forward looking AND contains no
 * number, no money, no percentage and no proper noun, so a messy but real answer
 * is never blocked. This is the floor that holds when no model is reachable.
 */
export function isHandWave(text: string) {
  return INTENT.test(text) && !hasSpecifics(text);
}

/**
 * The floor under the floor: filler that is long enough to pass the length
 * check but is not language. Catches "AAAA...", "asdf asdf asdf" and a word
 * repeated forty times, without ever firing on a short real sentence.
 */
export function isGibberish(text: string) {
  const t = text.trim();
  // one character majority (held-down key)
  const counts = new Map<string, number>();
  for (const ch of t.toLowerCase()) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const top = Math.max(...counts.values());
  if (top > t.length * 0.5) return true;
  // vocabulary floor: a real answer of 25+ chars uses more than a few words
  const words = t.toLowerCase().split(/[^a-z0-9$%']+/).filter(Boolean);
  const unique = new Set(words);
  if (words.length >= 12 && unique.size < Math.min(8, words.length / 3)) return true;
  return false;
}

export type StageStatus = {
  stage: number;
  total: number;
  doneCount: number;
  canGraduate: boolean;
  outstanding: { step: Step; verdict: StepVerdict }[];
  nextStep: Step | null;
};

/** Whole-stage view: what is cleared, what is left, and what to do next. */
export function gradeStage(stage: number, rows: ProgressRow[]): StageStatus {
  const s = stageOf(stage);
  const byId = new Map(rows.map((r) => [r.stepId, r]));

  const outstanding: StageStatus['outstanding'] = [];
  let doneCount = 0;

  for (const step of s.steps) {
    const row = byId.get(step.id);
    const verdict = row
      ? gradeStep(step, row.checked, row.evidence)
      : { done: false, missingChecks: step.doneWhen.slice(), evidenceProblem: null };
    const accepted = verdict.done && row?.review?.verdict !== 'needs_work';
    if (accepted) doneCount++;
    else outstanding.push({ step, verdict });
  }

  return {
    stage,
    total: s.steps.length,
    doneCount,
    canGraduate: doneCount === s.steps.length,
    outstanding,
    nextStep: outstanding[0]?.step ?? null,
  };
}
